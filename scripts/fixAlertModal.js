const fs = require('fs');
let lines = fs.readFileSync('app/admin/page.js', 'utf8').split('\n');

// Find the alert modal section and fully replace it
// Looking for lines from right after incomingOrder details div to the closing of the alert modal

const startMarker = '            </div>\r';  // closing of alert-modal-details div
const endMarker = '        </div>\r';         // closing of alert-modal-backdrop

// Find the index of the orphan text
const orphanIdx = lines.findIndex(l => l.trim() === 'REJECT ORDER');
if (orphanIdx !== -1) {
  console.log('Found orphan REJECT ORDER at line:', orphanIdx + 1);
  
  // Find start of the mess: right after </div> that closes alert-modal-details
  // Go backwards from orphanIdx to find the blank line before orphan text
  let blockStart = orphanIdx;
  while (blockStart > 0 && lines[blockStart - 1].trim() !== '') blockStart--;
  
  // Find end: find the closing </div></div></div> of the alert modal
  let blockEnd = orphanIdx;
  while (blockEnd < lines.length && !lines[blockEnd].includes('</div>')) blockEnd++;
  
  // lines[blockEnd] should be `            </div>` (closing of div class="alert-modal-actions")
  // lines[blockEnd+1] should be `          </div>` (closing of alert-modal-card)
  // lines[blockEnd+2] should be `        </div>` (closing of alert-modal-backdrop)
  
  console.log('Block from', blockStart, 'to', blockEnd + 3);
  console.log('Context around start:', lines.slice(blockStart - 2, blockStart + 2).join('\n'));
  console.log('Context around end:', lines.slice(blockEnd, blockEnd + 5).join('\n'));
  
  // Replace the entire bad block with the correct admin-only alert content
  const replacement = [
    '',
    '            <div style={{ marginTop: "16px", padding: "10px 16px", background: "rgba(52,152,219,0.08)", borderRadius: "10px", textAlign: "center" }}>',
    '              <span style={{ fontSize: "12px", color: "#3498db", fontWeight: "600" }}>',
    '                \ud83d\udce1 New order received \u2014 Chaimaker will accept or brew this order.',
    '              </span>',
    '            </div>',
    '',
    '            <div className="alert-modal-actions" style={{ marginTop: "16px" }}>',
    '              <button onClick={() => { stopAlertRinging(); setIncomingOrder(null); }} className="alert-btn" style={{ background: "rgba(44,27,13,0.08)", color: "#555", border: "1px solid rgba(44,27,13,0.15)" }}>',
    '                Dismiss',
    '              </button>',
    '            </div>',
    '          </div>',
    '        </div>',
  ];
  
  lines.splice(blockStart, blockEnd - blockStart + 3, ...replacement);
  fs.writeFileSync('app/admin/page.js', lines.join('\n'));
  console.log('Alert modal cleaned!');
} else {
  console.log('Orphan REJECT ORDER not found - might already be fixed');
  // Show around where alert modal should be
  lines.forEach((l, i) => {
    if (l.includes('alert-modal-actions')) console.log(i + ': ' + l.trim());
  });
}
