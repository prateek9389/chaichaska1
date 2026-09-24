const fs = require('fs');

const files = [
  'app/admin-chaichaska-login/page.js',
  'app/brewmaster-chaichaska-login/page.js'
];

const replacementContent = `                          <div style={{ marginBottom: "14px" }}>
                            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#52525b", textTransform: "uppercase", marginBottom: "6px" }}>Desk / Office Location</label>
                            
                            {(() => {
                              const recentAddresses = Array.from(new Set(
                                orders
                                  .filter(o => typeof o.address === 'string' || (o.address && typeof o.address.addressLine1 === 'string'))
                                  .map(o => typeof o.address === 'string' ? o.address : o.address.addressLine1)
                                  .filter(a => a && a.trim() !== "" && a !== "Walk-in Counter")
                              )).slice(0, 5);
                              
                              if (recentAddresses.length > 0) {
                                return (
                                  <div style={{ marginBottom: "8px", display: "flex", flexWrap: "wrap" }}>
                                    {recentAddresses.map((addr, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setOfflineOrderForm({ ...offlineOrderForm, address: addr })}
                                        style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", marginRight: "6px", marginBottom: "6px", cursor: "pointer", color: "#475569", transition: "all 0.2s ease" }}
                                        onMouseEnter={(e) => { e.target.style.background = "#e2e8f0"; }}
                                        onMouseLeave={(e) => { e.target.style.background = "#f1f5f9"; }}
                                      >
                                        + {addr}
                                      </button>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            <textarea`;

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    const regex = /<div style=\{\{\s*marginBottom:\s*"14px"\s*\}\}>\s*<label style=\{\{\s*display:\s*"block",\s*fontSize:\s*"11\.5px",\s*fontWeight:\s*"800",\s*color:\s*"#52525b",\s*textTransform:\s*"uppercase",\s*marginBottom:\s*"6px"\s*\}\}>Desk \/ Office Location<\/label>\s*<textarea/g;
    
    // Check if it's already patched
    if (!content.includes('const recentAddresses = Array.from(new Set(')) {
        content = content.replace(regex, replacementContent);
        fs.writeFileSync(f, content);
        console.log(`Patched ${f}`);
    } else {
        console.log(`Already patched ${f}`);
    }
  }
});
