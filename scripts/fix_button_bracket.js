const fs = require('fs');
const path = 'app/chaimaker/page.js';
let content = fs.readFileSync(path, 'utf8');

const target = `                        </button>
                      )})}
                    </div>
                  </div>
                </div>

                {/* STATS ROW */}`;

const replacement = `                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* STATS ROW */}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
  console.log("Restored the button map closing bracket!");
} else {
  console.log("Could not find the target string.");
}
