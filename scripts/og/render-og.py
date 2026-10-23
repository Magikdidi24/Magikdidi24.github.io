"""Renders public/og.png (1200 x 630), the social preview card.

Left: the name and availability on paper. Right: the simulated photon figure,
labeled "Simulated data". Needs Node 22.18+ and Python Playwright with Chromium.

    python3 scripts/og/render-og.py
"""
import base64, os, subprocess, tempfile
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FONT = os.path.join(ROOT, 'node_modules/@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2')
OUT = os.path.join(ROOT, 'public/og.png')

tmp = tempfile.mkdtemp()
comp = os.path.join(tmp, 'composite.png')
# 4 px cells, 152 x 158 cells: 608 x 632 px, cropped by the layout to 600 x 630
subprocess.run(['node', os.path.join(ROOT, 'scripts/og/composite.mjs'), comp, '152', '158', '4', '0.5', '0.5'], check=True)
img64 = base64.b64encode(open(comp, 'rb').read()).decode()

html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: 'S'; src: url('file://{FONT}') format('woff2'); font-weight: 400 900; }}
* {{ box-sizing: border-box; margin: 0; }}
body {{ width: 1200px; height: 630px; background: #f3f5f7; color: #17202a; font-family: 'S', sans-serif;
       display: grid; grid-template-columns: 600px 600px; overflow: hidden; }}
.text {{ padding: 64px 56px 56px 64px; display: flex; flex-direction: column; }}
h1 {{ font-size: 78px; line-height: 0.98; letter-spacing: -0.035em; font-weight: 600; }}
.lede {{ margin-top: 28px; font-size: 29px; line-height: 1.32; letter-spacing: -0.005em; max-width: 22ch; }}
.avail {{ margin-top: auto; font-size: 22px; line-height: 1.4; color: #4e5b68; max-width: 30ch; }}
.url {{ margin-top: 14px; font-size: 20px; color: #5f6b77; }}
.fig {{ position: relative; width: 600px; height: 630px; overflow: hidden; background: #0a0f14; }}
.fig img {{ position: absolute; left: -4px; top: -1px; width: 608px; height: 632px; image-rendering: pixelated; }}
.line {{ position: absolute; left: 300px; top: 0; bottom: 0; width: 2px; background: #e3e9ef; }}
.chip {{ position: absolute; font-size: 17px; font-weight: 500; color: #e3e9ef; background: rgba(10,15,20,.78);
        padding: 5px 10px; }}
.l {{ left: 18px; top: 18px; }} .r {{ right: 18px; top: 18px; }}
.sim {{ left: 18px; bottom: 18px; font-size: 20px; }}
</style></head><body>
<div class="text">
  <h1>Samuel<br>Berthelot</h1>
  <p class="lede">AI engineering student at EPITA, on exchange in Tokyo.</p>
  <p class="avail">Looking for a 6-month AI engineering internship in Tokyo from March 2027.</p>
  <p class="url">magikdidi24.github.io</p>
</div>
<div class="fig"><img src="data:image/png;base64,{img64}" alt=""><div class="line"></div>
<span class="chip l">Raw counts</span><span class="chip r">Reconstruction</span><span class="chip sim">Simulated data</span></div>
</body></html>"""
page = os.path.join(tmp, 'og.html')
open(page, 'w').write(html)
with sync_playwright() as p:
    browser = p.chromium.launch()
    tab = browser.new_page(viewport={'width': 1200, 'height': 630})
    tab.goto('file://' + page)
    tab.wait_for_timeout(600)
    tab.screenshot(path=OUT)
    browser.close()
print('wrote', OUT, os.path.getsize(OUT), 'bytes')
