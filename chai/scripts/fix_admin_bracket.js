const fs = require('fs');
const path = 'app/admin/page.js';
let content = fs.readFileSync(path, 'utf8');

const target = `                          </div>
                        ))}
                      </div>`;

const replacement = `                          </div>
                        )})}
                      </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
console.log("Fixed bracket in admin page.");
