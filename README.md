# ABSPL Cost Analysis

Cost-per-plan analysis of Alliance Broadband (ABSPL) tariff packages.

Visit this link for the visualization: <https://arneshrc.github.io/ABSPL-Cost-Analysis>

## Data Extraction Pipeline

Source: <https://alliancebroadband.co.in/tariff-tabular>

Data is stored in `data/data.json`. It is an array of: 
```ts
{
    planName: string,
    validityDays: number,
    speedMbps: number,
    totalPriceRupees: number
}
```

### Using Browser console

Open the page, then paste this into the DevTools console (F12). It copies the JSON to your clipboard.

```js
const plans = [...document.querySelectorAll("#tblTariffs tbody tr")].map(tr => {
  const td = tr.querySelectorAll("td");
  return {
    planName: td[0].innerText.trim(),
    validityDays: +td[1].innerText.replace(/\D/g, ""),       // Validity -> days
    speedMbps: +td[2].innerText.replace(/\D/g, ""),          // Speed -> Mbps
    totalPriceRupees: +td[5].innerText.replace(/[^\d.]/g, ""),// Price -> number
  };
});
const json = JSON.stringify(plans, null, "\t");
copy(json);            // now in clipboard — paste into data/data.json
console.log(json);
```

### Using Python

```python
import json, re
import requests
from bs4 import BeautifulSoup

URL = "https://alliancebroadband.co.in/tariff-tabular"
OUT = "data/data.json"

soup = BeautifulSoup(requests.get(URL, timeout=30).text, "html.parser")

plans = []
for tr in soup.select("#tblTariffs tbody tr"):
    td = tr.find_all("td")
    plans.append({
        "planName": td[0].get_text(strip=True),
        "validityDays": int(re.sub(r"\D", "", td[1].get_text())),       # Validity -> days
        "speedMbps": int(re.sub(r"\D", "", td[2].get_text())),          # Speed -> Mbps
        "totalPriceRupees": int(float(re.sub(r"[^\d.]", "", td[5].get_text()))),# Price -> rupees
    })

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(plans, f, indent="\t", ensure_ascii=False)
```

Requires `requests` and `beautifulsoup4`. Re-run any time to refresh against the live page.
