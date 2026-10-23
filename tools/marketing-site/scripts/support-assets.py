from pathlib import Path
import sys,json
from xml.sax.saxutils import escape
base=Path(__file__).resolve().parents[3]
if len(sys.argv)>1:sys.path.insert(0,sys.argv[1])
import qrcode
root=base
config=json.loads((root/'tools/marketing-site/content/support.json').read_text(encoding='utf-8'))
out=root/'assets/support'
out.mkdir(exist_ok=True)
qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=1,border=4)
qr.add_data(config['billUrl']);qr.make(fit=True)
matrix=qr.get_matrix();size=len(matrix)
cells=''.join(f'M{x} {y}h1v1h-1z' for y,row in enumerate(matrix) for x,cell in enumerate(row) if cell)
svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="256" height="256" role="img" aria-labelledby="title"><title id="title">ЮMoney: добровольная поддержка 590 рублей</title><metadata>{escape(config["billUrl"])}</metadata><rect width="{size}" height="{size}" fill="#fff"/><path d="{cells}" fill="#243643" shape-rendering="crispEdges"/></svg>'
(out/'yoomoney-590-qr.svg').write_text(svg,encoding='utf-8',newline='\n')
badge=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-labelledby="title desc"><title id="title">Поддержать материалы Андрея Индыкова</title><desc id="desc">Любая сумма по СБП. Номер {config['displayPhone']}, банк ЮMoney. QR открывает добровольный перевод 590 рублей через ЮMoney.</desc><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#f6f7f5"/><stop offset="1" stop-color="#e7edf0"/></linearGradient></defs><rect width="1200" height="630" rx="32" fill="url(#bg)"/><path d="M50 550C300 420 310 700 720 490" fill="none" stroke="#cad6d5" stroke-width="12"/><rect x="810" y="28" width="362" height="574" rx="22" fill="#34586b"/><g font-family="Arial, sans-serif" fill="#243643"><text x="55" y="76" font-size="20" font-weight="700" letter-spacing="2">АНДРЕЙ ИНДЫКОВ · ИНСТРУМЕНТЫ ДЛЯ ЖИЗНИ</text><text x="55" y="157" font-size="49" font-weight="700">Было полезно?</text><text x="55" y="216" font-size="49" font-weight="700">Можно сказать спасибо.</text><rect x="55" y="255" width="690" height="218" rx="20" fill="#fffdf8" stroke="#a8b7bf"/><text x="84" y="302" font-size="21" font-weight="700" letter-spacing="2">СБП · ЛЮБАЯ СУММА</text><text x="84" y="370" font-size="47" font-weight="700">{config['displayPhone']}</text><text x="84" y="425" font-size="28">Банк получателя: ЮMoney</text><text x="55" y="528" font-size="24">Практики открыты. Поддержка добровольная.</text><text x="55" y="574" font-size="23" fill="#52656c">indikov.ru/one-layer/</text></g><g font-family="Arial, sans-serif" fill="#fff" text-anchor="middle"><text x="991" y="91" font-size="27" font-weight="700">ЮMoney</text><text x="991" y="152" font-size="43" font-weight="700">590 ₽</text><text x="991" y="190" font-size="18">Добровольная поддержка</text><rect x="857" y="220" width="268" height="268" rx="14" fill="#fff"/><svg x="867" y="230" width="248" height="248" viewBox="0 0 {size} {size}"><rect width="{size}" height="{size}" fill="#fff"/><path d="{cells}" fill="#243643" shape-rendering="crispEdges"/></svg><text x="991" y="535" font-size="18">QR открывает форму ЮMoney</text><text x="991" y="567" font-size="16" fill="#d3dce0">Это не QR-платёж СБП</text></g></svg>'''
(out/'donation-card.svg').write_text(badge,encoding='utf-8',newline='\n')
assert qr.data_list[0].data.decode()==config['billUrl']
print('Generated vector support card and QR for the exact supplied bill URL.')
