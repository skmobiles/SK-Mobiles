# SK MOBILES V5.6.77 — Inline / JavaScript Style Mutation Audit

## Scope

Audited the V5.6.76 consolidated source without changing runtime code. This phase classifies inline styles and JavaScript-driven style mutations before any refactor.

## Findings

- Inline `style=` attributes in `index.html`: **298** (static HTML scan).
- JavaScript/HTML direct `.style.property =` assignments: **183** occurrences across source files.
- Direct `.style.cssText =` / style-setter patterns are included in the detailed occurrence list where matched.

### Most frequently assigned properties

- `display`: 95
- `cssText`: 18
- `background`: 10
- `color`: 7
- `width`: 6
- `maxWidth`: 5
- `margin`: 5
- `overflow`: 5
- `padding`: 4
- `boxSizing`: 4
- `printColorAdjust`: 3
- `webkitPrintColorAdjust`: 3
- `borderRadius`: 2
- `breakBefore`: 2
- `pageBreakBefore`: 2
- `border`: 2
- `borderColor`: 2
- `position`: 2
- `colorScheme`: 1
- `gridColumn`: 1
- `boxShadow`: 1
- `fontFamily`: 1
- `paddingTop`: 1
- `minWidth`: 1

## Safety classification

- **Visibility/state toggles** such as `display`, `visibility`, and `opacity` are functional UI state and must not be deleted as cosmetic patches.
- **Print/PDF styles** must remain isolated from app-screen typography and layout.
- **Visual/layout mutations** (width, padding, margin, border, background, color, radius, etc.) are candidates for CSS classes/design tokens, but each requires checking when/where it runs.
- `cssText` assignments and dynamically generated inline styles can override stylesheet rules and need call-site context before replacement.

## Highest-risk hotspots

The largest direct-assignment families are `display` and `cssText`. These are not safe to mass-replace: they may control modal visibility, conditional fields, empty states, printing, and dynamic panels. The next refactor should migrate only verified presentation-only assignments to named classes or shared tokens, leaving state transitions intact.

## Detailed occurrence list

| File | Line | Classification | Source excerpt |
|---|---:|---|---|
| `index.html` | 49 | Visibility/state toggling (do not blindly move) | `<img id="skLoginLogoImg" src="Logo.png" alt="SK Mobiles Logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">` |
| `js/app.js` | 1573 | Visibility/state toggling (do not blindly move) | `loginLogo.onerror = function(){ this.style.display='none'; const fb=this.nextElementSibling; if(fb) fb.style.display='flex'; };` |
| `js/app.js` | 1580 | Review manually | `active.forEach((m,i)=>{m.style.setProperty('z-index',String(20000+i),'important');const sheet=m.querySelector('.modal-sheet');if(sheet)sheet.style.setProperty('z-index',String(20001+i),'important');});` |
| `js/app.js` | 1581 | Visual/layout mutation (candidate for tokens/classes) | `modal.style.setProperty('position','fixed','important'); modal.style.setProperty('inset','0','important'); modal.style.setProperty('z-index',String(22000+active.length),'important');` |
| `js/app.js` | 1582 | Visual/layout mutation (candidate for tokens/classes) | `const sheet=modal.querySelector('.modal-sheet'); if(sheet){sheet.style.setProperty('position','relative','important');sheet.style.setProperty('z-index',String(22001+active.length),'important');}` |
| `js/app.js` | 1611 | Visibility/state toggling (do not blindly move) | `m.style.display='';` |
| `js/app.js` | 1630 | Visibility/state toggling (do not blindly move) | `m.style.display='';` |
| `js/app.js` | 1750 | Visual/layout mutation (candidate for tokens/classes) | `document.documentElement.style.setProperty('--app-status-color',SK_THEME_STATUS_COLORS[theme]\|\|SK_THEME_STATUS_COLORS.light);` |
| `js/app.js` | 1792 | Visual/layout mutation (candidate for tokens/classes) | `document.documentElement.style.setProperty('--app-font',family);` |
| `js/app.js` | 1798 | Visual/layout mutation (candidate for tokens/classes) | `document.body.style.setProperty('font-family',family,'important');` |
| `js/app.js` | 1800 | Visual/layout mutation (candidate for tokens/classes) | `if(viewport) viewport.style.setProperty('font-family',family,'important');` |
| `js/app.js` | 1808 | Visual/layout mutation (candidate for tokens/classes) | `preview.style.setProperty('font-family',family,'important');` |
| `js/app.js` | 1817 | Visual/layout mutation (candidate for tokens/classes) | `if(SK_APP_FONTS[key]) card.style.setProperty('font-family',SK_APP_FONTS[key],'important');` |
| `js/app.js` | 1826 | Visual/layout mutation (candidate for tokens/classes) | `document.documentElement.style.setProperty('--app-font',family);` |
| `js/app.js` | 1828 | Visual/layout mutation (candidate for tokens/classes) | `document.body.style.setProperty('font-family',family);` |
| `js/app.js` | 1829 | Visual/layout mutation (candidate for tokens/classes) | `if(viewport) viewport.style.setProperty('font-family',family);` |
| `js/app.js` | 1830 | Visual/layout mutation (candidate for tokens/classes) | `if(preview) preview.style.setProperty('font-family',family);` |
| `js/app.js` | 1861 | Visual/layout mutation (candidate for tokens/classes) | `if(SK_APP_FONTS[key]) card.style.setProperty('font-family',SK_APP_FONTS[key],'important');` |
| `js/app.js` | 1973 | Review manually | `root.style.setProperty('--primary',accent);` |
| `js/app.js` | 1974 | Review manually | `root.style.setProperty('--primary-gradient',`linear-gradient(135deg,${accent} 0%,${primary2} 100%)`);` |
| `js/app.js` | 1975 | Review manually | `root.style.setProperty('--glass-btn-bg',accent);` |
| `js/app.js` | 1976 | Visual/layout mutation (candidate for tokens/classes) | `root.style.setProperty('--glass-btn-border',primary2);` |
| `js/app.js` | 1977 | Review manually | `root.style.setProperty('--glass-pill-active',accent);` |
| `js/app.js` | 1978 | Visual/layout mutation (candidate for tokens/classes) | `root.style.setProperty('--glass-pill-border',primary2);` |
| `js/app.js` | 1979 | Review manually | `root.style.setProperty('--badge-bg',light?skMix(accent,'#FFFFFF',.90):skMix(accent,'#000000',.72));` |
| `js/app.js` | 1980 | Visual/layout mutation (candidate for tokens/classes) | `root.style.setProperty('--badge-border',light?skMix(accent,'#FFFFFF',.70):skMix(accent,'#FFFFFF',.65));` |
| `js/app.js` | 1981 | Visual/layout mutation (candidate for tokens/classes) | `root.style.setProperty('--card-border',border);` |
| `js/app.js` | 1982 | Review manually | `root.style.setProperty('--page-bg',page);` |
| `js/app.js` | 1983 | Review manually | `root.style.setProperty('--bg',bg);` |
| `js/app.js` | 1984 | Review manually | `root.style.setProperty('--card-bg',card);` |
| `js/app.js` | 1985 | Review manually | `root.style.setProperty('--model-bg',model);` |
| `js/app.js` | 1986 | Review manually | `root.style.setProperty('--input-bg',light?'#FFFFFF':'#0B111B');` |
| `js/app.js` | 1987 | Review manually | `root.style.setProperty('--pill-bg',pill);` |
| `js/app.js` | 1988 | Visual/layout mutation (candidate for tokens/classes) | `root.style.setProperty('--chip-bg',border);` |
| `js/app.js` | 1989 | Review manually | `root.style.setProperty('--bottom-nav-bg',light?'rgba(255,255,255,.94)':'rgba(8,11,18,.94)');` |
| `js/app.js` | 1990 | Review manually | `root.style.setProperty('--header-bg',light?'rgba(255,255,255,.90)':'rgba(7,10,16,.90)');` |
| `js/app.js` | 1991 | Review manually | `root.style.setProperty('--modal-bg',light?'#FFFFFF':'#0B1019');` |
| `js/app.js` | 1992 | Review manually | `root.style.setProperty('--text',text);` |
| `js/app.js` | 1993 | Review manually | `root.style.setProperty('--text-muted',muted);` |
| `js/app.js` | 1994 | Visual/layout mutation (candidate for tokens/classes) | `root.style.setProperty('--glass-shadow',shadow);` |
| `js/app.js` | 1995 | Visual/layout mutation (candidate for tokens/classes) | `root.style.setProperty('--card-elevation',shadow);` |
| `js/app.js` | 1999 | Visual/layout mutation (candidate for tokens/classes) | `root.style.setProperty('--ui-card-radius',cardRadiusMap[settings.cardRadius]\|\|'12px');` |
| `js/app.js` | 2000 | Visual/layout mutation (candidate for tokens/classes) | `root.style.setProperty('--ui-button-radius',buttonRadiusMap[settings.buttonRadius]\|\|'8px');` |
| `js/app.js` | 2001 | Review manually | `root.style.setProperty('--ui-scale',scaleMap[settings.scale]\|\|'1');` |
| `js/app.js` | 2002 | Visibility/state toggling (do not blindly move) | `root.style.setProperty('--ui-aura-opacity',settings.aura?.45:0);` |
| `js/app.js` | 2017 | Visual/layout mutation (candidate for tokens/classes) | `root.style.colorScheme=resolved;` |
| `js/app.js` | 2020 | Review manually | `const preview=document.querySelector('#skUiAppearanceStudio .sk-ui-preview-card');if(preview)preview.style.setProperty('--preview-primary',accent);` |
| `js/app.js` | 2238 | Visual/layout mutation (candidate for tokens/classes) | `document.documentElement.style.setProperty('--glass-shadow', `0 4px ${14 * depthFactor}px rgba(37, 99, 235, ${0.12 * depthFactor})`);` |
| `js/app.js` | 2366 | Visibility/state toggling (do not blindly move) | `a.style.display = 'none';` |
| `js/app.js` | 2512 | Visibility/state toggling (do not blindly move) | `bar.style.display = 'flex';` |
| `js/app.js` | 2553 | Visibility/state toggling (do not blindly move) | `bar.style.display = 'none';` |
| `js/app.js` | 2938 | Visibility/state toggling (do not blindly move) | `if (searchRow) searchRow.style.display = 'none';` |
| `js/app.js` | 2939 | Visibility/state toggling (do not blindly move) | `if (catScroll) catScroll.style.display = 'none';` |
| `js/app.js` | 3105 | Visibility/state toggling (do not blindly move) | `if (searchRow) searchRow.style.display = 'flex';` |
| `js/app.js` | 3106 | Visibility/state toggling (do not blindly move) | `if (catScroll) catScroll.style.display = 'none';` |
| `js/app.js` | 3205 | Visibility/state toggling (do not blindly move) | `if (clearBtn) clearBtn.style.display = currentSearchTerm.length > 0 ? 'flex' : 'none';` |
| `js/app.js` | 3213 | Visibility/state toggling (do not blindly move) | `document.getElementById('clearSearchBtn').style.display = 'none';` |
| `js/app.js` | 3296 | Visibility/state toggling (do not blindly move) | `viewNew.style.display = 'block';` |
| `js/app.js` | 3297 | Visibility/state toggling (do not blindly move) | `viewHist.style.display = 'none';` |
| `js/app.js` | 3302 | Visibility/state toggling (do not blindly move) | `viewHist.style.display = 'block';` |
| `js/app.js` | 3303 | Visibility/state toggling (do not blindly move) | `viewNew.style.display = 'none';` |
| `js/app.js` | 3349 | Visual/layout mutation (candidate for tokens/classes) | `document.getElementById('salePriceCol').style.gridColumn = isCreditOrEmi ? 'auto' : '1 / -1';` |
| `js/app.js` | 3350 | Visibility/state toggling (do not blindly move) | `document.getElementById('advancePriceCol').style.display = isCreditOrEmi ? 'block' : 'none';` |
| `js/app.js` | 3351 | Visibility/state toggling (do not blindly move) | `document.getElementById('balanceDueContainer').style.display = isCreditOrEmi ? 'flex' : 'none';` |
| `js/app.js` | 3353 | Visibility/state toggling (do not blindly move) | `document.getElementById('pvRowAdvance').style.display = isCreditOrEmi ? 'table-row' : 'none';` |
| `js/app.js` | 3354 | Visibility/state toggling (do not blindly move) | `document.getElementById('pvRowBalance').style.display = isCreditOrEmi ? 'table-row' : 'none';` |
| `js/app.js` | 3356 | Visibility/state toggling (do not blindly move) | `document.getElementById('emiSection').style.display = mode === 'EMI' ? 'block' : 'none';` |
| `js/app.js` | 3358 | Visibility/state toggling (do not blindly move) | `document.getElementById('creditSection').style.display = mode === 'Credit' ? 'block' : 'none';` |
| `js/app.js` | 3454 | Visibility/state toggling (do not blindly move) | `imei2Row.style.display = 'table-row';` |
| `js/app.js` | 3457 | Visibility/state toggling (do not blindly move) | `imei2Row.style.display = 'none';` |
| `js/app.js` | 3472 | Visibility/state toggling (do not blindly move) | `document.getElementById('pvEmiYellowBox').style.display = currentPayMode === 'EMI' ? 'block' : 'none';` |
| `js/app.js` | 3473 | Visibility/state toggling (do not blindly move) | `document.getElementById('pvEmiScheduleSection').style.display = currentPayMode === 'EMI' ? 'block' : 'none';` |
| `js/app.js` | 3477 | Visibility/state toggling (do not blindly move) | `pvCreditBox.style.display = 'block';` |
| `js/app.js` | 3481 | Visibility/state toggling (do not blindly move) | `pvCreditBox.style.display = 'none';` |
| `js/app.js` | 3570 | Visibility/state toggling (do not blindly move) | `const item=document.createElement('div'); item.style.cssText="background:var(--card-bg);border:1px solid var(--card-border);border-radius:18px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;ali` |
| `js/app.js` | 3666 | Visibility/state toggling (do not blindly move) | `if (imei2Row) imei2Row.style.display = 'table-row';` |
| `js/app.js` | 3669 | Visibility/state toggling (do not blindly move) | `if (imei2Row) imei2Row.style.display = 'none';` |
| `js/app.js` | 3679 | Visual/layout mutation (candidate for tokens/classes) | `pill.style.background = 'var(--pill-bg)';` |
| `js/app.js` | 3680 | Visual/layout mutation (candidate for tokens/classes) | `pill.style.color = 'var(--text)';` |
| `js/app.js` | 3681 | Visual/layout mutation (candidate for tokens/classes) | `pill.style.padding = '2px 8px';` |
| `js/app.js` | 3682 | Visual/layout mutation (candidate for tokens/classes) | `pill.style.borderRadius = '8px';` |
| `js/app.js` | 3697 | Visibility/state toggling (do not blindly move) | `if (pvRowAdvance) pvRowAdvance.style.display = isCreditOrEmi ? 'table-row' : 'none';` |
| `js/app.js` | 3698 | Visibility/state toggling (do not blindly move) | `if (pvRowBalance) pvRowBalance.style.display = isCreditOrEmi ? 'table-row' : 'none';` |
| `js/app.js` | 3711 | Visibility/state toggling (do not blindly move) | `if (emiBox) emiBox.style.display = 'block';` |
| `js/app.js` | 3712 | Visibility/state toggling (do not blindly move) | `if (emiSection) emiSection.style.display = 'block';` |
| `js/app.js` | 3724 | Visibility/state toggling (do not blindly move) | `if (emiBox) emiBox.style.display = 'none';` |
| `js/app.js` | 3725 | Visibility/state toggling (do not blindly move) | `if (emiSection) emiSection.style.display = 'none';` |
| `js/app.js` | 3732 | Visibility/state toggling (do not blindly move) | `if (creditBox) creditBox.style.display = 'block';` |
| `js/app.js` | 3735 | Visibility/state toggling (do not blindly move) | `if (creditBox) creditBox.style.display = 'none';` |
| `js/app.js` | 3767 | Visual/layout mutation (candidate for tokens/classes) | `wrapper.style.cssText = "background:#fff;color:#1e293b;padding:20px;border-radius:18px;font-family:'Plus Jakarta Sans',sans-serif;";` |
| `js/app.js` | 3770 | Visibility/state toggling (do not blindly move) | `header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #edf0f6;padding-bottom:12px;margin-bottom:12px;gap:14px;';` |
| `js/app.js` | 3775 | Visual/layout mutation (candidate for tokens/classes) | `backBtn.style.cssText = 'border:1px solid #e2e8f0;background:#f8fafc;border-radius:10px;padding:7px 10px;font-weight:800;cursor:pointer;';` |
| `js/app.js` | 3780 | Visual/layout mutation (candidate for tokens/classes) | `title.style.cssText = 'font-weight:950;color:#d9166f;font-size:1.3rem;';` |
| `js/app.js` | 3783 | Visual/layout mutation (candidate for tokens/classes) | `meta.style.cssText = 'text-align:right;font-size:.75rem;';` |
| `js/app.js` | 3791 | Visual/layout mutation (candidate for tokens/classes) | `previewClone.style.width = '100%';` |
| `js/app.js` | 3792 | Visual/layout mutation (candidate for tokens/classes) | `previewClone.style.maxWidth = '100%';` |
| `js/app.js` | 3793 | Visual/layout mutation (candidate for tokens/classes) | `previewClone.style.margin = '0';` |
| `js/app.js` | 3794 | Visual/layout mutation (candidate for tokens/classes) | `previewClone.style.boxShadow = 'none';` |
| `js/app.js` | 3795 | Visual/layout mutation (candidate for tokens/classes) | `previewClone.style.borderRadius = '0';` |
| `js/app.js` | 3798 | Visibility/state toggling (do not blindly move) | `actions.style.cssText = 'display:flex;gap:14px;margin-top:14px;flex-wrap:wrap;';` |
| `js/app.js` | 3803 | Visual/layout mutation (candidate for tokens/classes) | `editBtn.style.cssText = 'flex:1;min-width:120px;padding:9px;font-size:.75rem;';` |
| `js/app.js` | 3813 | Visual/layout mutation (candidate for tokens/classes) | `downloadBtn.style.cssText = 'flex:1;min-width:120px;padding:9px;font-size:.75rem;';` |
| `js/app.js` | 3820 | Visual/layout mutation (candidate for tokens/classes) | `waBtn.style.cssText = 'flex:1;min-width:120px;padding:9px;font-size:.75rem;';` |
| `js/app.js` | 3865 | Visibility/state toggling (do not blindly move) | `if(data){img.src=data;img.style.display='block';}else{img.removeAttribute('src');img.style.display='none';}` |
| `js/app.js` | 3971 | Visibility/state toggling (do not blindly move) | `if (row) row.style.display = 'none';` |
| `js/app.js` | 3983 | Visual/layout mutation (candidate for tokens/classes) | `root.style.width = '100%';` |
| `js/app.js` | 3984 | Visual/layout mutation (candidate for tokens/classes) | `root.style.maxWidth = '100%';` |
| `js/app.js` | 3985 | Visual/layout mutation (candidate for tokens/classes) | `root.style.margin = '0';` |
| `js/app.js` | 3986 | Visual/layout mutation (candidate for tokens/classes) | `root.style.padding = '0';` |
| `js/app.js` | 3987 | Visual/layout mutation (candidate for tokens/classes) | `root.style.background = '#ffffff';` |
| `js/app.js` | 3988 | Visual/layout mutation (candidate for tokens/classes) | `root.style.color = '#1e293b';` |
| `js/app.js` | 3989 | Visual/layout mutation (candidate for tokens/classes) | `root.style.boxSizing = 'border-box';` |
| `js/app.js` | 3990 | Visual/layout mutation (candidate for tokens/classes) | `root.style.fontFamily = '"Plus Jakarta Sans", Arial, sans-serif';` |
| `js/app.js` | 3991 | Visual/layout mutation (candidate for tokens/classes) | `root.style.color = '#1e293b';` |
| `js/app.js` | 3992 | Visual/layout mutation (candidate for tokens/classes) | `root.style.background = '#ffffff';` |
| `js/app.js` | 3996 | Visual/layout mutation (candidate for tokens/classes) | `page1.style.width = '100%';` |
| `js/app.js` | 3997 | Visual/layout mutation (candidate for tokens/classes) | `page1.style.maxWidth = '100%';` |
| `js/app.js` | 3998 | Visual/layout mutation (candidate for tokens/classes) | `page1.style.margin = '0';` |
| `js/app.js` | 3999 | Visual/layout mutation (candidate for tokens/classes) | `page1.style.padding = '0';` |
| `js/app.js` | 4000 | Visual/layout mutation (candidate for tokens/classes) | `page1.style.background = '#ffffff';` |
| `js/app.js` | 4001 | Visual/layout mutation (candidate for tokens/classes) | `page1.style.boxSizing = 'border-box';` |
| `js/app.js` | 4009 | Visual/layout mutation (candidate for tokens/classes) | `page2.style.width = '100%';` |
| `js/app.js` | 4010 | Visual/layout mutation (candidate for tokens/classes) | `page2.style.maxWidth = '100%';` |
| `js/app.js` | 4011 | Visual/layout mutation (candidate for tokens/classes) | `page2.style.margin = '0';` |
| `js/app.js` | 4012 | Visual/layout mutation (candidate for tokens/classes) | `page2.style.padding = '0';` |
| `js/app.js` | 4013 | Visual/layout mutation (candidate for tokens/classes) | `page2.style.background = '#ffffff';` |
| `js/app.js` | 4014 | Visual/layout mutation (candidate for tokens/classes) | `page2.style.boxSizing = 'border-box';` |
| `js/app.js` | 4015 | Print/PDF presentation (preserve separately) | `page2.style.breakBefore = 'page';` |
| `js/app.js` | 4016 | Print/PDF presentation (preserve separately) | `page2.style.pageBreakBefore = 'always';` |
| `js/app.js` | 4023 | Visual/layout mutation (candidate for tokens/classes) | `yellowBox.style.background = '#fef3c7';` |
| `js/app.js` | 4024 | Visual/layout mutation (candidate for tokens/classes) | `yellowBox.style.border = '1px solid #fde047';` |
| `js/app.js` | 4025 | Visual/layout mutation (candidate for tokens/classes) | `yellowBox.style.color = '#92400e';` |
| `js/app.js` | 4026 | Print/PDF presentation (preserve separately) | `yellowBox.style.printColorAdjust = 'exact';` |
| `js/app.js` | 4027 | Print/PDF presentation (preserve separately) | `yellowBox.style.webkitPrintColorAdjust = 'exact';` |
| `js/app.js` | 4031 | Visual/layout mutation (candidate for tokens/classes) | `schedule.style.border = '1px solid #fde047';` |
| `js/app.js` | 4032 | Visual/layout mutation (candidate for tokens/classes) | `schedule.style.background = '#ffffff';` |
| `js/app.js` | 4033 | Print/PDF presentation (preserve separately) | `schedule.style.printColorAdjust = 'exact';` |
| `js/app.js` | 4034 | Print/PDF presentation (preserve separately) | `schedule.style.webkitPrintColorAdjust = 'exact';` |
| `js/app.js` | 4037 | Visual/layout mutation (candidate for tokens/classes) | `th.style.background = '#fef3c7';` |
| `js/app.js` | 4038 | Visual/layout mutation (candidate for tokens/classes) | `th.style.color = '#92400e';` |
| `js/app.js` | 4039 | Print/PDF presentation (preserve separately) | `th.style.printColorAdjust = 'exact';` |
| `js/app.js` | 4040 | Print/PDF presentation (preserve separately) | `th.style.webkitPrintColorAdjust = 'exact';` |
| `js/app.js` | 4055 | Review manually | `typeBadge.style.cssText = [` |
| `js/app.js` | 4063 | Visual/layout mutation (candidate for tokens/classes) | `typeBadge.style.borderColor = '#f59e0b';` |
| `js/app.js` | 4064 | Visual/layout mutation (candidate for tokens/classes) | `typeBadge.style.background = '#fef3c7';` |
| `js/app.js` | 4065 | Visual/layout mutation (candidate for tokens/classes) | `typeBadge.style.color = '#92400e';` |
| `js/app.js` | 4067 | Visual/layout mutation (candidate for tokens/classes) | `typeBadge.style.borderColor = '#94a3b8';` |
| `js/app.js` | 4068 | Visual/layout mutation (candidate for tokens/classes) | `typeBadge.style.background = '#f1f5f9';` |
| `js/app.js` | 4069 | Visual/layout mutation (candidate for tokens/classes) | `typeBadge.style.color = '#334155';` |
| `js/app.js` | 4073 | Visual/layout mutation (candidate for tokens/classes) | `customerBlock.style.position = 'relative';` |
| `js/app.js` | 4074 | Visual/layout mutation (candidate for tokens/classes) | `customerBlock.style.paddingTop = '9px';` |
| `js/app.js` | 4107 | Review manually | `holder.style.cssText = [` |
| `js/app.js` | 4113 | Visual/layout mutation (candidate for tokens/classes) | `clone.style.width = '100%';` |
| `js/app.js` | 4114 | Visual/layout mutation (candidate for tokens/classes) | `clone.style.maxWidth = '100%';` |
| `js/app.js` | 4115 | Visual/layout mutation (candidate for tokens/classes) | `clone.style.margin = '0';` |
| `js/app.js` | 4116 | Visual/layout mutation (candidate for tokens/classes) | `clone.style.boxSizing = 'border-box';` |
| `js/app.js` | 4152 | Visibility/state toggling (do not blindly move) | `const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none';` |
| `js/app.js` | 4174 | Visibility/state toggling (do not blindly move) | `if (emi && emi.style.display !== 'none') { emi.style.breakBefore = 'page'; emi.style.pageBreakBefore = 'always'; }` |
| `js/app.js` | 4175 | Visual/layout mutation (candidate for tokens/classes) | `clone.style.cssText = 'width:100%;max-width:100%;margin:0;padding:0;background:#fff;color:#1e293b;box-sizing:border-box;font-family:"Plus Jakarta Sans",Arial,sans-serif;';` |
| `js/app.js` | 4217 | Visibility/state toggling (do not blindly move) | `anchor.href = url; anchor.download = filename; anchor.style.display = 'none';` |
| `js/app.js` | 4291 | Visibility/state toggling (do not blindly move) | `document.getElementById('skRjScheduleWrap').style.display='none';` |
| `js/app.js` | 4293 | Visibility/state toggling (do not blindly move) | `document.getElementById('skRjCancelEdit').style.display='none';` |
| `js/app.js` | 4327 | Visibility/state toggling (do not blindly move) | `document.getElementById('skRjJobsView').style.display=jobs?'block':'none';` |
| `js/app.js` | 4328 | Visibility/state toggling (do not blindly move) | `document.getElementById('skRjPendingView').style.display=pending?'block':'none';` |
| `js/app.js` | 4329 | Visibility/state toggling (do not blindly move) | `document.getElementById('skRjHistoryView').style.display=history?'block':'none';` |
| `js/app.js` | 4439 | Visibility/state toggling (do not blindly move) | `document.getElementById('skRjScheduleWrap').style.display=j.workType==='Scheduled'?'block':'none';` |
| `js/app.js` | 4441 | Visibility/state toggling (do not blindly move) | `document.getElementById('skRjCancelEdit').style.display='block';` |
| `js/app.js` | 4686 | Visibility/state toggling (do not blindly move) | `fieldWrap.style.display='block';` |
| `js/app.js` | 4687 | Visual/layout mutation (candidate for tokens/classes) | `fieldWrap.style.position='relative';` |
| `js/app.js` | 4688 | Visual/layout mutation (candidate for tokens/classes) | `fieldWrap.style.width='100%';` |
| `js/app.js` | 4689 | Visual/layout mutation (candidate for tokens/classes) | `fieldWrap.style.minWidth='0';` |
| `js/app.js` | 4834 | Visibility/state toggling (do not blindly move) | `document.getElementById('skRjScheduleWrap').style.display=this.value==='Scheduled'?'block':'none';` |
| `js/app.js` | 4882 | Visibility/state toggling (do not blindly move) | `if(m){m.style.display='flex';m.classList.add('active');document.body.classList.add('modal-open');if(typeof window.skAppHistoryRepairOpen==='function')window.skAppHistoryRepairOpen('skUrgentRepairModal')}` |
| `js/app.js` | 4885 | Visibility/state toggling (do not blindly move) | `window.skCloseUrgentRepairModal=function(){const m=document.getElementById('skUrgentRepairModal');if(m){m.classList.remove('active');m.style.display='none'}document.body.classList.remove('modal-open');if(typeof window.sk` |
| `js/app.js` | 4906 | Visibility/state toggling (do not blindly move) | `card.style.display=jobs.length?'flex':'none';` |
| `js/app.js` | 4916 | Visibility/state toggling (do not blindly move) | `bar.style.display='flex';` |
| `js/app.js` | 4917 | Visibility/state toggling (do not blindly move) | `clearTimeout(notifyTimer);notifyTimer=setTimeout(()=>{bar.style.display='none'},8000);` |
| `js/app.js` | 4918 | Visibility/state toggling (do not blindly move) | `document.getElementById('skUrgentNotifyOpen').onclick=function(){bar.style.display='none';openUrgentModal()};` |
| `js/app.js` | 4919 | Visibility/state toggling (do not blindly move) | `document.getElementById('skUrgentNotifyClose').onclick=function(){bar.style.display='none'};` |
| `js/app.js` | 4954 | Visual/layout mutation (candidate for tokens/classes) | `const b=document.createElement('button');b.id='skUrgentEnableBtn';b.type='button';b.textContent='🔔';b.title='Enable notifications';b.style.cssText='position:fixed;right:12px;bottom:78px;z-index:10340;border:0;border-radi` |
| `js/app.js` | 5024 | Visibility/state toggling (do not blindly move) | `document.querySelectorAll('.modal-overlay.active').forEach(function(m){m.classList.remove('active');m.style.display='';});` |
| `js/app.js` | 5026 | Visibility/state toggling (do not blindly move) | `if(urgent){urgent.classList.remove('active');urgent.style.display='none';}` |
| `js/app.js` | 5164 | Visual/layout mutation (candidate for tokens/classes) | `const sel=document.getElementById('skWorkerLoginSelect'),pin=document.getElementById('skRolePin'),id=sel?.value\|\|'',pw=pin?.value\|\|'';const w=workers().find(x=>x.id===id);if(!w){document.getElementById('skRoleMsg').textC` |
| `js/app.js` | 5193 | Visual/layout mutation (candidate for tokens/classes) | `document.body.style.overflow='';` |
| `js/app.js` | 5316 | Visibility/state toggling (do not blindly move) | `el.textContent=map[r]\|\|''; el.style.display=map[r]?'inline-flex':'none';` |
| `js/app.js` | 5449 | Visibility/state toggling (do not blindly move) | `const adminBtn=document.getElementById('skAdminControlBtn');if(adminBtn)adminBtn.style.display='none';` |
| `js/app.js` | 5451 | Visibility/state toggling (do not blindly move) | `staticAdminButtons.forEach(el=>{el.style.display='none';});` |
| `js/app.js` | 5511 | Visibility/state toggling (do not blindly move) | `if(!host)return;const b=document.createElement('button');b.id='skAdminControlBtn';b.className='menu-drawer-btn';b.textContent='👑 Admin Control';b.onclick=function(){skOpenAdminPanel();toggleLeftDrawer(false);};host.inser` |
| `js/app.js` | 5513 | Visibility/state toggling (do not blindly move) | `function refreshAdminButton(){const b=document.getElementById('skAdminControlBtn');if(b)b.style.display=admin()?'':'none';}` |
| `js/app.js` | 5580 | Visual/layout mutation (candidate for tokens/classes) | `document.body.style.overflow='';` |
| `js/app.js` | 5638 | Visual/layout mutation (candidate for tokens/classes) | `document.body.style.overflow='';` |
| `js/app.js` | 5896 | Visibility/state toggling (do not blindly move) | `if(b)b.style.display=localStorage.getItem('sk_current_role_v1')==='admin'?'':'none';` |
| `js/app.js` | 6114 | Visibility/state toggling (do not blindly move) | `box.style.cssText='display:none;margin:8px 0 12px;padding:10px;border:1px solid var(--card-border);border-radius:12px;background:var(--pill-bg);';` |
| `js/app.js` | 6120 | Visibility/state toggling (do not blindly move) | `box.style.display='none';` |
| `js/app.js` | 6123 | Visibility/state toggling (do not blindly move) | `box.style.display='block';` |
| `js/app.js` | 6135 | Visibility/state toggling (do not blindly move) | `box.style.display='none';` |
| `js/app.js` | 6144 | Visibility/state toggling (do not blindly move) | `box.style.display='none';` |
| `js/app.js` | 7536 | Visibility/state toggling (do not blindly move) | `function cpShowMain(){document.getElementById('skCPMainView').style.display='block';document.getElementById('skCPDetailView').style.display='none';skCPRender()}` |
| `js/app.js` | 7572 | Visibility/state toggling (do not blindly move) | `modal.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(15,23,42,.48);';` |
| `js/app.js` | 7586 | Review manually | `modal.style.setProperty('z-index','2147483647','important');` |
| `js/app.js` | 7623 | Visibility/state toggling (do not blindly move) | `document.getElementById('skCPDetailView').innerHTML=html;document.getElementById('skCPMainView').style.display='none';document.getElementById('skCPDetailView').style.display='block';` |
| `js/app.js` | 7632 | Visibility/state toggling (do not blindly move) | `modal.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(15,23,42,.48);';` |
| `js/app.js` | 7643 | Review manually | `modal.style.setProperty('z-index','2147483647','important');` |
| `js/app.js` | 7698 | Visual/layout mutation (candidate for tokens/classes) | `window.skCPOpenRepairJob=function(id){var jobId=String(id\|\|'');if(!jobId)return;var jobs=[];try{jobs=JSON.parse(localStorage.getItem('skx_repair_jobs_v2')\|\|'[]')}catch(e){}if(!Array.isArray(jobs)\|\|!jobs.some(function(j){` |
| `js/app.js` | 7699 | Visual/layout mutation (candidate for tokens/classes) | `window.skCPEditRepairJob=function(id){var jobId=String(id\|\|'');if(!jobId)return;var jobs=[];try{jobs=JSON.parse(localStorage.getItem('skx_repair_jobs_v2')\|\|'[]')}catch(e){}if(!Array.isArray(jobs)\|\|!jobs.some(function(j){` |
| `js/app.js` | 7718 | Visibility/state toggling (do not blindly move) | `document.getElementById('skCPPaymentMode').value='Cash';document.getElementById('skCPEmiMode').value='none';document.getElementById('skCPEmiFields').style.display='none';` |
| `js/app.js` | 7719 | Visibility/state toggling (do not blindly move) | `document.getElementById('skCPAdvanceGroup').style.display=type==='payment'?'none':'block';` |
| `js/app.js` | 7720 | Visibility/state toggling (do not blindly move) | `document.getElementById('skCPPaymentModeGroup').style.display=type==='payment'?'block':'none';` |
| `js/app.js` | 7721 | Visibility/state toggling (do not blindly move) | `document.getElementById('skCPEmiGroup').style.display=type==='payment'?'none':'block';` |
| `js/app.js` | 7745 | Visibility/state toggling (do not blindly move) | `window.skCPToggleEmi=function(){document.getElementById('skCPEmiFields').style.display=document.getElementById('skCPEmiMode').value==='emi'?'grid':'none'}` |
| `js/app.js` | 8022 | Visibility/state toggling (do not blindly move) | `function newItem(){resetEditor();document.getElementById('skAccessoryEditor').style.display='block';document.getElementById('skAccessoryEditorTitle').textContent='Add Accessory';}` |
| `js/app.js` | 8031 | Visibility/state toggling (do not blindly move) | `function cancel(){document.getElementById('skAccessoryEditor').style.display='none';resetEditor();}` |
| `js/app.js` | 8132 | Visibility/state toggling (do not blindly move) | `const form=$('skUsedPurchaseForm');if(form)form.style.display='none';` |
| `js/app.js` | 8133 | Visibility/state toggling (do not blindly move) | `const register=$('skUsedRows')?.closest('.bill-section');if(register)register.style.display='none';` |
| `js/app.js` | 8135 | Visual/layout mutation (candidate for tokens/classes) | `if(!catalog){catalog=document.createElement('section');catalog.id='skUsedHomeCatalog';catalog.className='bill-section sk-used-catalog';catalog.style.cssText='padding:10px;margin:8px 0;max-width:100%;box-sizing:border-box` |
| `js/app.js` | 8136 | Visibility/state toggling (do not blindly move) | `catalog.style.display='block';` |
| `js/app.js` | 8139 | Visibility/state toggling (do not blindly move) | `const stats=$('skUsedStatTotal')?.parentElement?.parentElement;if(stats)stats.style.display='none';` |
| `js/app.js` | 8141 | Visibility/state toggling (do not blindly move) | `window.skUsedShowManagement=function(){const form=$('skUsedPurchaseForm');if(form)form.style.display='grid';const register=$('skUsedRows')?.closest('.bill-section');if(register)register.style.display='block';const catalo` |
| `js/firebase-sync.js` | 225 | Visibility/state toggling (do not blindly move) | `[oldGrid, oldLabel, oldPin, oldWorker, oldBtn].forEach(el=>{ if(el) el.style.display="none"; });` |
| `js/firebase-sync.js` | 249 | Visibility/state toggling (do not blindly move) | `[oldGrid, oldLabel, oldPin, oldWorker, oldBtn].forEach(el=>{ if(el) el.style.display="none"; });` |
| `js/firebase-sync.js` | 266 | Visibility/state toggling (do not blindly move) | `document.body.style.overflow = show ? "hidden" : "";` |

## Next safe refactor

1. Build a small shared token layer for typography, spacing, control height, borders, and modal sizing.
2. Replace verified visual-only inline styles with semantic classes; preserve display/state toggles and all print-specific styles.
3. Keep theme-specific values as CSS custom properties rather than hardcoded presentation assignments where safe.
4. Run syntax checks, selector-presence checks, and regression tests for Home, Settings, Billing, Credit, Repair, History, Used Mobile, and Print/PDF.

## Changes made in this phase

- No runtime HTML/CSS/JavaScript changed. This is intentional: the audit identified many inline mutations whose role cannot safely be inferred from syntax alone.
- CSS consolidation from V5.6.76 is retained unchanged.
- Browser/Firebase end-to-end testing has not been performed.