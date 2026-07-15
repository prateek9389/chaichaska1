const fs = require('fs');

function fixLine(filePath, targetLineNum) {
  let lines = fs.readFileSync(filePath, 'utf8').split('\\n');
  if (lines[targetLineNum - 1].includes('))}')) {
    lines[targetLineNum - 1] = lines[targetLineNum - 1].replace('))}', ')})}');
    fs.writeFileSync(filePath, lines.join('\\n'));
    console.log("Fixed " + filePath + " at line " + targetLineNum);
  } else {
    console.log("Line " + targetLineNum + " did not match in " + filePath + ". Line was: " + lines[targetLineNum - 1]);
  }
}

fixLine('app/admin/page.js', 2420);
fixLine('app/chaimaker/page.js', 2317);
