const fs = require('fs');

function fixBracket(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // We know the structure is:
  //                           </div>
  //                         ))}
  //                       </div>
  //                     </div>
  // 
  //                     {/* Right Panel: Today's Subscription Orders checklist */}

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
                    
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content);
    console.log("Fixed bracket in " + filePath);
  } else {
    console.log("Could not find target in " + filePath);
  }
}

fixBracket('app/admin/page.js');
fixBracket('app/chaimaker/page.js');
