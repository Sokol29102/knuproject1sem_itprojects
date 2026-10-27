from pathlib import Path
from xml.etree import ElementTree as ET
from html import escape
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
W, H = 1600, 1940
colors = {'s1': ('#EAF3FF', '#3975B8'), 's2': ('#EAF7F0', '#34805A'), 'future': ('#F2F2F5', '#777A88')}
nodes = [
 ('paste', 500, 245, ['UC-01  Enter / edit text'], 's1'),
 ('upload', 500, 345, ['UC-02  Import requirements', 'TXT now; PDF / DOCX later'], 's1'),
 ('preview', 500, 445, ['UC-03  Preview accepted text'], 's1'),
 ('validate', 1040, 295, ['UC-04  Validate input'], 's1'),
 ('analyze', 500, 680, ['UC-05  Analyze requirements'], 's2'),
 ('classify', 1040, 600, ['UC-06  Identify candidate', 'functional / non-functional items'], 's2'),
 ('ambiguity', 1040, 710, ['UC-07  Check for ambiguity'], 's2'),
 ('risks', 1040, 820, ['UC-08  Review risks', 'and constraints'], 'future'),
 ('review', 500, 1020, ['UC-09  Review findings'], 's2'),
 ('inspect', 1040, 980, ['UC-10  Inspect source excerpts,', 'explanations and questions'], 's2'),
 ('rewrite', 1040, 1150, ['UC-11  Request clearer wording'], 'future'),
 ('chat', 500, 1320, ['UC-12  Discuss the document'], 'future'),
 ('save', 1040, 1280, ['UC-13  Save project, analysis', 'and conversation'], 'future'),
 ('context', 1040, 1430, ['UC-14  Use saved requirements', 'and project decisions'], 'future'),
 ('open', 500, 1580, ['UC-15  Open saved project', 'and conversation history'], 'future'),
]
N = {n[0]: n for n in nodes}
edges = []
def edge(a,b,kind,pts,label=None,lpos=None):
    edges.append((a,b,kind,pts,label,lpos))

# Actor associations are undirected. Shared routing stays outside the system.
for target in ['paste','upload','preview','analyze','review','chat','open']:
    y=N[target][2]
    edge('reviewer',target,'association',[(146,900),(205,900),(205,y),(345,y)])

edge('paste','validate','include',[(651,245),(877,283)],'«include»',(758,243))
edge('upload','validate','include',[(651,345),(877,307)],'«include»',(758,344))
edge('analyze','validate','include',[(500,644),(500,545),(810,545),(810,350),(903,322)],'«include»',(810,450))
edge('analyze','classify','include',[(643,665),(884,615)],'«include»',(760,620))
edge('analyze','ambiguity','include',[(651,686),(880,704)],'«include»',(760,682))
edge('risks','analyze','extend',[(887,805),(780,805),(640,701)],'«extend»',(765,787))
edge('review','inspect','include',[(650,1009),(880,991)],'«include»',(765,980))
edge('rewrite','review','extend',[(880,1150),(760,1150),(620,1041)],'«extend»',(762,1128))
edge('chat','save','include',[(650,1309),(880,1291)],'«include»',(765,1274))
edge('chat','context','include',[(635,1342),(892,1412)],'«include»',(760,1363))
edge('open','context','include',[(635,1561),(760,1515),(899,1450)],'«include»',(765,1503))

# Supporting AI actor participates only in AI-assisted behavior.
for target in ['classify','ambiguity','risks','rewrite']:
    y=N[target][2]
    edge('ai',target,'association',[(1460,710),(1410,710),(1410,y),(1201,y)])
edge('ai','chat','association',[(1460,710),(1410,710),(1410,1340),(651,1340)])

svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
 '<rect width="100%" height="100%" fill="white"/>',
 '<defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M 1 1 L 10 6 L 1 11" fill="none" stroke="#596477" stroke-width="1.7"/></marker></defs>']
im=Image.new('RGB',(W,H),'white'); d=ImageDraw.Draw(im)
fontpath=Path('C:/Windows/Fonts')
def font(size,bold=False): return ImageFont.truetype(str(fontpath/('segoeuib.ttf' if bold else 'segoeui.ttf')),size)
def text(x,y,s,size=18,fill='#25354A',bold=False,anchor='middle'):
    svg.append(f'<text x="{x}" y="{y}" font-family="Segoe UI,Arial,sans-serif" font-size="{size}" fill="{fill}" font-weight="{700 if bold else 400}" text-anchor="{anchor}">{escape(s)}</text>')
    d.text((x,y),s,font=font(size,bold),fill=fill,anchor='ls' if anchor=='start' else 'ms')
def rect(x,y,w,h,fill,stroke,width=1,r=0):
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>')
    if r:d.rounded_rectangle((x,y,x+w,y+h),r,fill=fill,outline=stroke,width=width)
    else:d.rectangle((x,y,x+w,y+h),fill=fill,outline=stroke,width=width)
def line(pts,fill='#596477',width=2,dashed=False,arrow=False):
    svg.append(f'<polyline points="{" ".join(f"{x},{y}" for x,y in pts)}" fill="none" stroke="{fill}" stroke-width="{width}"'+(' stroke-dasharray="7 5"' if dashed else '')+(' marker-end="url(#arrow)"' if arrow else '')+'/>')
    for p,q in zip(pts,pts[1:]):
        if not dashed:d.line([p,q],fill=fill,width=width)
        else:
            length=math.dist(p,q)
            for k in range(0,int(length),12):
                a=k/length; b=min(k+7,length)/length
                d.line([(p[0]+(q[0]-p[0])*a,p[1]+(q[1]-p[1])*a),(p[0]+(q[0]-p[0])*b,p[1]+(q[1]-p[1])*b)],fill=fill,width=width)
    if arrow:
        p,q=pts[-2:]; ang=math.atan2(q[1]-p[1],q[0]-p[0]); r=11
        arms=[(q[0]-r*math.cos(ang-.5),q[1]-r*math.sin(ang-.5)),q,(q[0]-r*math.cos(ang+.5),q[1]-r*math.sin(ang+.5))]
        d.line(arms,fill=fill,width=width)

text(65,58,'AI Requirements Analyzer',34,bold=True,anchor='start')
text(65,91,'Use-case diagram · full product vision with delivery scope',20,fill='#647086',anchor='start')
for x,label,state in [(65,'Sprint 1', 's1'),(265,'Sprint 2','s2'),(465,'Future scope','future')]:
    rect(x,112,24,20,*colors[state],r=4);text(x+35,129,label,17,anchor='start')
text(900,129,'Colors show planned delivery, not completion.',16,fill='#647086',anchor='start')
rect(245,165,1125,1630,'#FFFFFF','#26374D',2)
text(270,198,'AI Requirements Analyzer — system boundary',19,bold=True,anchor='start')
for y,h,label in [(215,300,'INPUT'),(550,325,'ANALYSIS'),(910,295,'REVIEW'),(1230,520,'CONTINUITY — FUTURE')]:
    text(267,y+14,label,14,fill='#7A8493',bold=True,anchor='start')
    # Light section rule is not a separate system boundary.
    if y>215:line([(267,y-15),(1348,y-15)],'#DCE1E8',1)

for a,b,kind,pts,label,pos in edges:line(pts,dashed=kind!='association',arrow=kind!='association')
for ident,x,y,labels,state in nodes:
    fill,stroke=colors[state]
    svg.append(f'<ellipse cx="{x}" cy="{y}" rx="160" ry="37" fill="{fill}" stroke="{stroke}" stroke-width="1.8"/>')
    d.ellipse((x-160,y-37,x+160,y+37),fill=fill,outline=stroke,width=2)
    for i,s in enumerate(labels):text(x,y+6+(i-(len(labels)-1)/2)*22,s,16 if len(s)>31 else 17)
for a,b,kind,pts,label,pos in edges:
    if label:
        x,y=pos;rect(x-49,y-18,98,24,'#FFFFFF','#FFFFFF');text(x,y,label,15,fill='#596477')

def actor(x,y,label,sub):
    svg.append(f'<circle cx="{x}" cy="{y-46}" r="15" fill="white" stroke="#26374D" stroke-width="2"/>')
    d.ellipse((x-15,y-61,x+15,y-31),fill='white',outline='#26374D',width=2)
    for pts in [[(x,y-31),(x,y+24)],[(x-28,y-8),(x+28,y-8)],[(x,y+24),(x-24,y+63)],[(x,y+24),(x+24,y+63)]]:line(pts,'#26374D',2)
    text(x,y+90,label,19,bold=True)
    for i,s in enumerate(sub):text(x,y+115+i*22,s,15,fill='#647086')
actor(115,900,'Reviewer',['Student / analyst', 'Developer / supervisor'])
actor(1490,710,'AI service',['Gemini API', 'Supporting actor'])
text(1040,864,'Extension: broader review is requested.',13,fill='#647086')
text(1040,1195,'Extension: reviewer requests a reformulation.',13,fill='#647086')
text(500,1680,'Saved projects, history and decisions',16,fill='#647086')
text(500,1705,'require later requirements and estimates.',16,fill='#647086')
text(270,1770,'Reviewer retains responsibility for interpreting and approving suggestions.',16,fill='#596477',anchor='start')
text(65,1840,'UML key',18,bold=True,anchor='start')
text(65,1870,'Solid line: actor participation. Dashed arrow: «include» = required reused behavior; «extend» = optional addition.',17,anchor='start')
text(65,1902,'Validation failures, retries and loading states are alternate flows, not separate user goals. No authentication or collaboration is implied.',16,fill='#647086',anchor='start')
svg.append('</svg>')
(ROOT/'AI-Requirements-Analyzer-Use-Cases.svg').write_text('\n'.join(svg),encoding='utf-8')
im.save(ROOT/'AI-Requirements-Analyzer-Use-Cases.png')

# Native diagrams.net cells: every actor, oval and connector is editable.
mxfile=ET.Element('mxfile',host='app.diagrams.net',type='device')
diagram=ET.SubElement(mxfile,'diagram',id='full-use-cases',name='Full product use cases')
model=ET.SubElement(diagram,'mxGraphModel',dx='1600',dy='1940',grid='1',gridSize='10',page='1',pageWidth=str(W),pageHeight=str(H))
root=ET.SubElement(model,'root');ET.SubElement(root,'mxCell',id='0');ET.SubElement(root,'mxCell',id='1',parent='0')
def cell(ident,value,x,y,w,h,style):
    c=ET.SubElement(root,'mxCell',id=ident,value=value,style=style,vertex='1',parent='1')
    ET.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),attrib={'as':'geometry'})
    return c
cell('title','AI Requirements Analyzer — full use-case diagram',65,30,1450,50,'text;html=0;fontSize=30;align=left;fontStyle=1;')
cell('legend','Blue: Sprint 1    |    Green: Sprint 2    |    Gray: future scope\nDelivery scope is planned, not implementation status.',65,90,1450,55,'text;html=0;fontSize=18;align=left;')
cell('boundary','AI Requirements Analyzer',245,165,1125,1630,'rounded=0;whiteSpace=wrap;html=0;fillColor=none;strokeColor=#26374D;strokeWidth=2;verticalAlign=top;align=left;spacingTop=12;spacingLeft=20;fontStyle=1;fontSize=20;')
for ident,x,y,labels,state in nodes:
    fill,stroke=colors[state]
    cell(ident,'\n'.join(labels),x-160,y-37,320,74,f'ellipse;whiteSpace=wrap;html=0;fillColor={fill};strokeColor={stroke};fontColor=#25354A;fontSize=17;')
cell('reviewer','Reviewer\nStudent / analyst\nDeveloper / supervisor',85,839,60,125,'shape=umlActor;html=0;verticalLabelPosition=bottom;verticalAlign=top;fontSize=17;')
cell('ai','AI service\nGemini API',1460,649,60,125,'shape=umlActor;html=0;verticalLabelPosition=bottom;verticalAlign=top;fontSize=17;')
for i,(a,b,kind,pts,label,pos) in enumerate(edges):
    c=ET.SubElement(root,'mxCell',id=f'e{i}',value=label or '',edge='1',parent='1',source=a,target=b,style='html=0;rounded=0;strokeColor=#596477;fontSize=15;labelBackgroundColor=#FFFFFF;endArrow='+('open;dashed=1;' if kind!='association' else 'none;'))
    g=ET.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'})
    ar=ET.SubElement(g,'Array',attrib={'as':'points'})
    for x,y in pts[1:-1]:ET.SubElement(ar,'mxPoint',x=str(x),y=str(y))
cell('risk-condition','Extension: broader review is requested.',865,860,350,35,'text;html=0;fontSize=14;fontColor=#647086;')
cell('rewrite-condition','Extension: reviewer requests a reformulation.',845,1182,390,35,'text;html=0;fontSize=14;fontColor=#647086;')
cell('notes','Solid association = actor participation. «include» = required reused behavior. «extend» = optional addition.\nErrors, loading and retries are alternate flows. Human review remains mandatory. No accounts or collaboration are implied.',65,1820,1470,100,'text;html=0;fontSize=18;align=left;whiteSpace=wrap;')
ET.ElementTree(mxfile).write(ROOT/'AI-Requirements-Analyzer-Use-Cases.drawio',encoding='utf-8',xml_declaration=True)
print('Created editable draw.io, SVG and PNG; 15 use cases, 2 actors.')
