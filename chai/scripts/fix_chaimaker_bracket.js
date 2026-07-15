const fs = require('fs');
const path = 'app/chaimaker/page.js';
let content = fs.readFileSync(path, 'utf8');

const target = `                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Panel: Today's Subscription Orders checklist */}`;

const replacement = `                          </div>
                        )})}
                      </div>
                    </div>

                    {/* Right Panel: Today's Subscription Orders checklist */}`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
console.log("Fixed bracket in chaimaker page.");
