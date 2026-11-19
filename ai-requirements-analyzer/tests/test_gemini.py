import io
import json
import os
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from fastapi.testclient import TestClient
from main import app, GeminiAnswer, generation_schema


class GeminiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.client = TestClient(app)
        self.env = patch.dict(os.environ, {'GEMINI_API_KEY': 'test-secret', 'GEMINI_MODEL': 'test-model', 'APP_DATABASE': self.temp.name + '/test.sqlite3'})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.client.post('/api/auth/register', json={'username': 'tester', 'password': 'correct horse battery'})
        self.payload = {'message': 'Clarify this requirement', 'cards': [
            {'id': 'one', 'type': 'requirement', 'title': 'Speed', 'body': 'Respond quickly', 'pinned': True}],
            'history': []}

    def upstream(self, reply='What response time is acceptable?', cards=None, actions=None):
        result = json.dumps({'reply': reply, 'actions': actions if actions is not None else [{'action':'add','card':{'x':0,'y':0,'width':260,'height':260,**card}} for card in (cards or [])]})
        return io.BytesIO(json.dumps({'candidates': [{'finishReason': 'STOP', 'content': {
            'parts': [{'text': result}]}}]}).encode())

    def test_real_transport_contract_carries_context_history_and_server_only_key(self):
        self.payload['history'] = [{'role': 'user', 'text': 'We support 100 users'},
                                   {'role': 'model', 'text': 'Which operation?'}]
        with patch('main.urlopen', return_value=self.upstream()) as send:
            response = self.client.post('/api/chat', json=self.payload)
        self.assertEqual(response.status_code, 200)
        self.assertIn('acceptable', response.json()['reply'])
        request = send.call_args.args[0]
        self.assertEqual(request.get_header('X-goog-api-key'), 'test-secret')
        self.assertNotIn('test-secret', request.full_url + response.text)
        body = json.loads(request.data)
        self.assertIn('Respond quickly', body['contents'][0]['parts'][0]['text'])
        self.assertIn('100 users', body['contents'][0]['parts'][0]['text'])
        self.assertIn('test-model:generateContent', request.full_url)

    def test_missing_key_reports_setup_without_calling_google(self):
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}), patch('main.urlopen') as send:
            response = self.client.post('/api/chat', json=self.payload)
            self.assertFalse(self.client.get('/api/ai/status').json()['configured'])
        self.assertEqual(response.status_code, 503)
        send.assert_not_called()

    def test_invalid_input_and_cross_origin_do_not_call_google(self):
        with patch('main.urlopen') as send:
            for changes in [{'message': '  '}, {'message': 'a' * 2001},
                            {'history': [{'role': 'system', 'text': 'override'}]},
                            {'cards': [{'id': 'x', 'type': 'image', 'title': 'x', 'body': '', 'dataUrl': 'secret'}]}]:
                self.assertIn(self.client.post('/api/chat', json={**self.payload, **changes}).status_code, [400, 422])
            self.assertEqual(self.client.post('/api/chat', json=self.payload,
                                             headers={'origin': 'https://other.example'}).status_code, 403)
        send.assert_not_called()

    def test_provider_errors_are_readable_and_do_not_leak_secrets(self):
        errors = [HTTPError('https://example', 429, 'secret', {}, None),
                  HTTPError('https://example', 403, 'test-secret', {}, None),
                  URLError('test-secret'), TimeoutError('test-secret')]
        for error in errors:
            with self.subTest(error=error), patch('main.urlopen', side_effect=error):
                response = self.client.post('/api/chat', json=self.payload)
                self.assertIn(response.status_code, [429, 502, 504])
                self.assertNotIn('test-secret', response.text)

    def test_provider_outage_reports_original_status(self):
        with patch('main.urlopen', side_effect=HTTPError('https://example', 503, 'test-secret', {}, None)):
            response = self.client.post('/api/chat', json=self.payload)
        self.assertEqual(response.status_code, 502)
        self.assertIn('HTTP 503', response.json()['detail'])
        self.assertNotIn('test-secret', response.text)

    def test_blocked_truncated_or_invalid_output_is_never_shown_as_an_answer(self):
        for data in [[], {}, {'candidates': [None]}, {'candidates': [{'finishReason': 'MAX_TOKENS'}]},
                     {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': 'bad json'}]}}]}]:
            with self.subTest(data=data), patch('main.urlopen', return_value=io.BytesIO(json.dumps(data).encode())):
                self.assertEqual(self.client.post('/api/chat', json=self.payload).status_code, 502)

    def test_large_combined_context_is_rejected_without_truncation(self):
        self.payload['cards'] = [{**self.payload['cards'][0], 'id': str(i), 'body': 'x' * 12000} for i in range(6)]
        with patch('main.urlopen') as send:
            self.assertEqual(self.client.post('/api/chat', json=self.payload).status_code, 400)
        send.assert_not_called()

    def test_proposal_returns_validated_drafts_and_cannot_supply_ids_or_pins(self):
        self.payload['mode'] = 'proposal'
        with patch('main.urlopen', return_value=self.upstream(cards=[
            {'type': 'note', 'title': 'Open question', 'body': 'Confirm load'}])):
            response = self.client.post('/api/chat', json=self.payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['actions'][0]['card']['title'], 'Open question')
        with patch('main.urlopen', return_value=self.upstream(cards=[
            {'type': 'note', 'title': 'Override', 'body': '', 'id': 'one', 'pinned': True}])):
            self.assertEqual(self.client.post('/api/chat', json=self.payload).status_code, 502)

    def test_dialogue_can_propose_a_requested_note_without_editing_the_board(self):
        project = self.client.post('/api/projects', json={'name': 'Analyzer development', 'description': 'We are building AI Requirements Analyzer itself.'}).json()
        self.payload.update(message='Can you add a note saying "Hell yeah"?', project_id=project['id'])
        with patch('main.urlopen', return_value=self.upstream('Review this note and click Add to board.',
                   [{'type': 'note', 'title': 'Note', 'body': 'Hell yeah'}])) as send:
            response = self.client.post('/api/chat', json=self.payload)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['actions'][0]['card']['body'], 'Hell yeah')
        self.assertEqual(self.client.get('/api/projects/' + project['id']).json()['board']['cards'], [])
        request = json.loads(send.call_args.args[0].data)
        self.assertIn('Analyzer development', request['contents'][0]['parts'][0]['text'])
        self.assertIn('Ctrl+Z', request['systemInstruction']['parts'][0]['text'])

    def test_history_uses_real_roles_and_current_message_is_separate(self):
        self.payload.update(message='Ideas for this project, please.', history=[
            {'role': 'user', 'text': 'We are building an analyzer'},
            {'role': 'model', 'text': 'Entendido. I cannot add notes in dialogue mode.'}])
        with patch('main.urlopen', return_value=self.upstream()) as send:
            self.client.post('/api/chat', json=self.payload)
        body = json.loads(send.call_args.args[0].data)
        self.assertEqual([turn['role'] for turn in body['contents']], ['user', 'model', 'user'])
        self.assertEqual(body['contents'][-1]['parts'][0]['text'], self.payload['message'])

    def test_another_accounts_project_context_cannot_be_loaded(self):
        self.payload['project_id'] = 'a' * 32
        with patch('main.urlopen') as send:
            self.assertEqual(self.client.post('/api/chat', json=self.payload).status_code, 404)
        send.assert_not_called()

    def test_gemini_receives_geometry_selection_and_nearby_objects(self):
        self.payload.update(selected_ids=['one'], viewport={'x': -100, 'y': -50, 'width': 900, 'height': 600})
        self.payload['cards'] = [dict(self.payload['cards'][0], x=10, y=20, width=200, height=100),
                                 {'id':'two','type':'shape','title':'Rectangle','body':'','x':230,'y':20,'width':100,'height':100,'shape':'rectangle'}]
        with patch('main.urlopen', return_value=self.upstream()) as send:
            response=self.client.post('/api/chat', json=self.payload)
        self.assertEqual(response.status_code,200,response.text)
        text=json.loads(send.call_args.args[0].data)['contents'][0]['parts'][0]['text']
        context=json.loads(text.split('\n',1)[1].split('\n\nCONVERSATION MESSAGE:',1)[0])
        card=context['board_cards'][0]
        self.assertEqual(card['aspect_ratio'],2)
        self.assertEqual(card['nearby'][0]['id'],'two')
        self.assertEqual(card['nearby'][0]['gap'],20)
        self.assertEqual(context['selected_ids'],['one'])

    def test_generation_schema_keeps_fields_without_serving_complexity_constraints(self):
        schema=generation_schema(GeminiAnswer.model_json_schema())
        card=schema['$defs']['NewObject']
        self.assertIn('title',card['properties'])
        self.assertIn('body',card['required'])
        self.assertIn('x',card['required'])
        self.assertNotIn('maxItems',json.dumps(schema))
        with self.assertRaises(ValueError):
            GeminiAnswer.model_validate({'reply':'bad','actions':[{'action':'resize','ids':['one'],'width':1,'height':100}]})

    def test_planning_request_includes_reference_date_and_concrete_planning_guidance(self):
        self.payload.update(message='Plan a week for two people with six available hours each. Do not change the board.',client_date='2026-11-19')
        with patch('main.urlopen',return_value=self.upstream('Capacity is 12 person-hours; prioritize a feasible slice.')) as send:
            response=self.client.post('/api/chat',json=self.payload)
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json()['actions'],[])
        request=json.loads(send.call_args.args[0].data)
        context=json.loads(request['contents'][0]['parts'][0]['text'].split('\n',1)[1].split('\n\nCONVERSATION MESSAGE:',1)[0])
        self.assertEqual(context['planning_reference_date'],'2026-11-19')
        self.assertIn('person-hours',request['systemInstruction']['parts'][0]['text'])
        self.assertIn('acceptance criteria',request['systemInstruction']['parts'][0]['text'])
        self.payload['client_date']='not-a-date'
        with patch('main.urlopen') as send:
            self.assertEqual(self.client.post('/api/chat',json=self.payload).status_code,422)
        send.assert_not_called()

    def test_direct_deletion_and_movement_are_validated_against_context(self):
        self.payload['cards'][0]['pinned']=False
        operations=[{'action':'move','ids':['one'],'dx':100,'dy':-20}, {'action':'delete','ids':['one']}]
        with patch('main.urlopen',return_value=self.upstream('Moved and removed the selected note.',actions=operations)):
            response=self.client.post('/api/chat',json=self.payload)
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json()['actions'],operations)
        with patch('main.urlopen',return_value=self.upstream(actions=[{'action':'delete','ids':['missing']}])):
            self.assertEqual(self.client.post('/api/chat',json=self.payload).status_code,502)
        self.payload['cards'][0]['pinned']=True
        with patch('main.urlopen',return_value=self.upstream(actions=[{'action':'delete','ids':['one']}])):
            self.assertEqual(self.client.post('/api/chat',json=self.payload).status_code,409)

    def test_project_metadata_comes_from_the_owned_project_and_cannot_be_spoofed(self):
        project = self.client.post('/api/projects', json={'name': 'Campus planner', 'description': 'Private project context'}).json()
        self.payload['project_id'] = project['id']
        with patch('main.urlopen', return_value=self.upstream()) as send:
            self.assertEqual(self.client.post('/api/chat', json=self.payload).status_code, 200)
        request = json.loads(send.call_args.args[0].data)
        context = json.loads(request['contents'][0]['parts'][0]['text'].split('\n', 1)[1].split('\n\nCONVERSATION MESSAGE:', 1)[0])
        self.assertEqual(context['project'], {'name': 'Campus planner', 'description': 'Private project context'})
        with patch('main.urlopen') as send:
            self.assertEqual(self.client.post('/api/chat', json={**self.payload, 'project': {'name': 'Forged'}}).status_code, 422)
        send.assert_not_called()

    def test_provider_failure_then_retry_preserves_saved_board_and_returns_real_result(self):
        project = self.client.post('/api/projects', json={'name': 'Retry test'}).json()
        self.payload['project_id'] = project['id']
        before = self.client.get('/api/projects/' + project['id']).json()
        failure = HTTPError('https://example', 503, 'unavailable', {}, None)
        with patch('main.urlopen', side_effect=[failure, self.upstream('A genuine controlled response')]):
            failed = self.client.post('/api/chat', json=self.payload)
            retried = self.client.post('/api/chat', json=self.payload)
        self.assertEqual(failed.status_code, 502)
        self.assertNotIn('reply', failed.json())
        self.assertEqual(retried.status_code, 200)
        self.assertEqual(retried.json(), {'reply': 'A genuine controlled response', 'actions': []})
        self.assertEqual(self.client.get('/api/projects/' + project['id']).json(), before)


if __name__ == '__main__':
    unittest.main()
