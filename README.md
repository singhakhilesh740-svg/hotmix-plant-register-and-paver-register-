# Hot Mix Plant Register (Parishisht 1 / 3 / 5)

R&B hot mix plant ke registers — SCADA report aur bitumen gatepass se.

## GitHub Pages par chalana
1. GitHub par naya repo banao (jaise `hotmix-register`).
2. Ye saari files upload karo: `index.html, app.js, style.css, manifest.json, sw.js, icon.svg`.
3. Repo → Settings → Pages → Branch `main` / root → Save.
4. `https://<username>.github.io/hotmix-register/` khulega. Phone par "Add to Home screen".

## Truck-wise entry kaise banti hai
- SCADA (AVN Drum Mix Excel) mein har ~30 sec ki cumulative Net Mix Ton hoti hai.
- Har truck ki load capacity (Vehicles tab) tak cumulative pahunchte hi wo truck dispatch — samay = us SCADA reading ka time, net = SCADA ka asli farak.
- Plant 10 min se zyada band ho to adha bhara truck wahin dispatch (remark mein likha jata hai).
- 3 MT se kam bacha maal aakhri truck mein jud jata hai.
- Trucks ka total = SCADA ka din ka total (hamesha match).
- Agar SCADA mein Tripper No. bhara ho to asli tripper breaks use honge.
- Mix temp / tank temp = us truck ke loading time ki SCADA readings ka median.
- Hot aggregate temp SCADA mein nahi hota — manual.

## Chatbot
Settings mein Gemini API key (free: aistudio.google.com) — sirf device par save hoti hai.

## Data
Browser (localStorage) mein. Settings → Backup download se JSON backup lete raho.
