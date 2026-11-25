# Tarjetas del perfil: python scripts/tarjetas.py <repo del perfil>. Lee dist-profile/tarjetas.json (lo genera build.mjs).
import base64, html, io, json, os, sys
from PIL import Image
from playwright.sync_api import sync_playwright

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = sys.argv[1] + '/img'
os.makedirs(OUT, exist_ok=True)
THEMES = {'oscuro': ('#0f141b', '#30363d', '#f0f6fc', '#9198a1'), 'claro': ('#ffffff', '#d1d9e0', '#1f2328', '#59636e')}
CSS = '''*{box-sizing:border-box;margin:0}body{width:max-content;font-family:"Segoe UI",system-ui,sans-serif;background:transparent}
.c{width:800px;height:606px;border-radius:24px;border:2px solid var(--l);background:var(--b);overflow:hidden}.c img{display:block;width:100%;height:448px;object-fit:cover}
.t{padding:20px 28px;display:grid;grid-template-columns:1fr auto;column-gap:20px;align-items:center}h2{font-size:38px;font-weight:650;letter-spacing:-.02em;color:var(--i);white-space:nowrap}p{grid-column:1/-1;font-size:27px;line-height:1.28;color:var(--s);margin-top:4px;height:70px;overflow:hidden}
b{font-size:25px;font-weight:650;color:var(--i);border:2px solid var(--l);border-radius:99px;padding:3px 20px 6px}
.h{width:1640px;height:470px;border-radius:28px;border:2px solid #30363d;background:#000;overflow:hidden;position:relative;color:#fff}.h img{position:absolute;right:0;top:0;height:100%;width:1010px}.h div{position:absolute;left:64px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:14px}.h h2{font-size:92px;color:#fff}.h p{color:#b9bac4;font-size:34px;height:auto;max-width:500px}.h b{align-self:start;background:#fff;color:#000;border:0;font-size:30px;padding:10px 30px 13px;margin-top:14px}'''


def uri(f):
    b = io.BytesIO()
    Image.open(f).convert('RGBA').save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


with sync_playwright() as p:
    br = p.chromium.launch(channel='chrome', headless=True)
    pg = br.new_page(viewport={'width': 1700, 'height': 700})

    def shot(body, style, name, q):
        pg.set_content(f'<style>{CSS}</style><body style="{style}">{body}')
        pg.wait_for_function('[...document.images].every(i => i.complete)')
        png = pg.locator('body > *').last.screenshot(omit_background=True)
        Image.open(io.BytesIO(png)).convert('RGBA').save(f'{OUT}/{name}.webp', quality=q, method=6)

    for c in json.load(open('dist-profile/tarjetas.json', encoding='utf-8')):
        e = {k: html.escape(str(v)) for k, v in c.items()}
        if c['id'] == 'vision-pro':
            shot(f'<div class="h"><img src="{uri("img/perfil/vision-pro.webp")}"><div><h2>{e["name"]}</h2><p>{e["sum"]}</p><b>{e["go"]}</b></div></div>', '', f'vision-pro{c["suf"]}', 86)
            continue
        for th, (b, l, i, s) in THEMES.items():
            shot(f'<div class="c"><img src="{uri("img/t/" + c["id"] + ".webp")}"><div class="t"><h2>{e["name"]}</h2><b>{e["go"]}</b><p>{e["sum"]}</p></div></div>', f'--b:{b};--l:{l};--i:{i};--s:{s}', f'{c["id"]}-{th}{c["suf"]}', 82)
    br.close()
