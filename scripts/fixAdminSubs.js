const fs = require('fs');
let lines = fs.readFileSync('app/admin/page.js', 'utf8').split('\n');

// 1. Restore the broken form at line 2482
// The line currently has: "                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Image Link URL</label>"
const brokenFormIdx = lines.findIndex(l => l.includes('>Image Link URL</label>'));
if (brokenFormIdx !== -1 && lines[brokenFormIdx + 1].includes(')}')) {
  console.log('Found broken form at', brokenFormIdx + 1);
  const formRestoration = [
    '                          <input type="text" value={newAddonImg} onChange={(e) => setNewAddonImg(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />',
    '                        </div>',
    '                        <div className="form-group" style={{ marginBottom: "16px" }}>',
    '                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Short Description</label>',
    '                          <textarea rows="2" value={newAddonDesc} onChange={(e) => setNewAddonDesc(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px", resize: "none" }} />',
    '                        </div>',
    '                        <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>',
    '                          PUBLISH ADD-ON',
    '                        </button>',
    '                      </form>',
    '                    </div>',
    '                  </div>'
  ];
  lines.splice(brokenFormIdx + 1, 0, ...formRestoration);
}

// 2. Fix activeSubs reference error
const subsIdx = lines.findIndex(l => l.includes('activeTab === "subs" && (() => {'));
if (subsIdx !== -1) {
  console.log('Found subs block at', subsIdx + 1);
  // See if activeSubs is missing
  let hasActiveSubs = false;
  for (let i = subsIdx; i < subsIdx + 10; i++) {
    if (lines[i].includes('const activeSubs')) hasActiveSubs = true;
  }
  
  if (!hasActiveSubs) {
    const activeSubsLine = '              const activeSubs = subscriptions.filter(s => s.status === "Active");';
    lines.splice(subsIdx + 1, 0, activeSubsLine);
  }
}

fs.writeFileSync('app/admin/page.js', lines.join('\n'));
console.log('Admin page patched successfully.');
