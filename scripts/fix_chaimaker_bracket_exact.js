const fs = require('fs');

function fixBracket(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const subMapIndex = content.indexOf('subscriptions.map');
  if (subMapIndex !== -1) {
    const bracketIndex = content.indexOf('))}', subMapIndex);
    if (bracketIndex !== -1) {
      content = content.substring(0, bracketIndex) + ')})}' + content.substring(bracketIndex + 3);
      fs.writeFileSync(filePath, content);
      console.log("Fixed bracket in " + filePath);
    } else {
      console.log("Could not find bracket after sub map in " + filePath);
    }
  } else {
    console.log("Could not find subscriptions.map in " + filePath);
  }
}

fixBracket('app/chaimaker/page.js');
