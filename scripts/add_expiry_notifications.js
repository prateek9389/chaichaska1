const fs = require('fs');

function applyModifications(filePath, isAdmin) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Import updateSubscription if not present
  if (!content.includes('updateSubscription,')) {
    content = content.replace('getSubscriptions,', 'getSubscriptions, updateSubscription,');
  }

  // 2. Add isExpiringSoon calculation
  const calcTarget = `const isExpired = end > 0 && today > end;`;
  const calcReplacement = `const isExpired = end > 0 && today > end;
                          const daysLeft = end > 0 ? Math.ceil((end - today) / (1000 * 60 * 60 * 24)) : 999;
                          const isExpiringSoon = daysLeft <= 3 && daysLeft >= 0 && sub.status === "Active";`;
  if (content.includes(calcTarget) && !content.includes('const daysLeft')) {
    content = content.replace(calcTarget, calcReplacement);
  }

  // 3. Add EXPIRING SOON badge
  const badgeTargetAdmin = `<span style={{ fontSize: "11px", fontWeight: "bold", color: "#8a583c" }}>{sub.id} {isExpired && <span style={{color: "white", background: "#e74c3c", padding: "2px 4px", borderRadius: "4px", fontSize: "10px", marginLeft: "4px"}}>EXPIRED - STOP DELIVERY</span>}</span>`;
  const badgeReplacementAdmin = `<span style={{ fontSize: "11px", fontWeight: "bold", color: "#8a583c" }}>{sub.id} {isExpired && <span style={{color: "white", background: "#e74c3c", padding: "2px 4px", borderRadius: "4px", fontSize: "10px", marginLeft: "4px"}}>EXPIRED - STOP DELIVERY</span>} {isExpiringSoon && <span style={{color: "white", background: "#f39c12", padding: "2px 4px", borderRadius: "4px", fontSize: "10px", marginLeft: "4px"}}>EXPIRING SOON</span>}</span>`;

  const badgeTargetChaimaker = `<span style={{ fontSize: "11px", fontWeight: "bold", color: "#8a583c" }}>{sub.id}</span>`;
  const badgeReplacementChaimaker = `<span style={{ fontSize: "11px", fontWeight: "bold", color: "#8a583c" }}>{sub.id} {isExpiringSoon && <span style={{color: "white", background: "#f39c12", padding: "2px 4px", borderRadius: "4px", fontSize: "10px", marginLeft: "4px"}}>EXPIRING SOON</span>}</span>`;

  if (isAdmin && content.includes(badgeTargetAdmin)) {
    content = content.replace(badgeTargetAdmin, badgeReplacementAdmin);
  } else if (!isAdmin && content.includes(badgeTargetChaimaker)) {
    content = content.replace(badgeTargetChaimaker, badgeReplacementChaimaker);
  }

  // 4. Update the Stop Plan button logic
  const buttonRegex = /onClick=\{\(\) => \{\s*setToastMsg\(\`Subscription \$\{sub\.id\} paused successfully\.\`\);\s*setTimeout\(\(\) => setToastMsg\(""\), 3000\);\s*\}\}/g;
  
  const buttonReplacement = `onClick={() => {
                                    const newStatus = sub.status === "Active" ? "Cancelled" : "Active";
                                    updateSubscription(sub.id, { status: newStatus });
                                    setToastMsg(\`Subscription \${sub.id} \${newStatus === "Cancelled" ? "stopped" : "resumed"} successfully.\`);
                                    setTimeout(() => setToastMsg(""), 3000);
                                  }}`;
                                  
  if (buttonRegex.test(content)) {
    content = content.replace(buttonRegex, buttonReplacement);
  }

  // 5. Update the Force Dispatch button logic to actually notify? The user just says "forch dispatch the plan".
  // Right now it just shows a toast. We'll leave it as a visual toast for dispatch since "dispatching" doesn't strictly have a database state per subscription, it's just an action for today.

  // 6. Rename "Pause Plan" to "Stop Plan"
  const textTarget = `{sub.status === "Active" ? "Pause Plan" : "Resume Plan"}`;
  const textReplacement = `{sub.status === "Active" ? "Stop Plan" : "Resume Plan"}`;
  if (content.includes(textTarget)) {
    content = content.replace(textTarget, textReplacement);
  }

  fs.writeFileSync(filePath, content);
  console.log("Updated " + filePath);
}

applyModifications('app/admin/page.js', true);
applyModifications('app/chaimaker/page.js', false);
