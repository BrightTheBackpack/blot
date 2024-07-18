const execSync = require("child_process").execSync;


var github = undefined;
var context = undefined;
async function run({ gh, ctx }) {
  github = gh;
  context = ctx;




  return "cool";
}


// make or update comment with `body` markdown
async function comment(body) {
  body = "Test " + body;
  let id = await already();
  if (id === -1) {
    github.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: body,
    });
    console.error(
      `Creating new comment with ${body} on ${context.repo.owner}/${context.repo.repo}#${context.issue.number}`
    );
  } else {
    github.rest.issues.updateComment({
      comment_id: id,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: body,
    });
    console.error(
      `Updating ${id} to ${body} on ${context.repo.owner}/${context.repo.repo}#${context.issue.number}`
    );
  }

  // find an issue from us
  async function already() {
    const cmts = await github.rest.issues.listComments({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
    });
    for (const i of cmts.data)
      if (i.body.includes("MY-ONBOARD-BOT")) {
        return i.id;
      }
    return -1;
  }
}

var gitdifffiles = null;
async function gitDiffFiles() {
  if (gitdifffiles === null)
    gitdifffiles = (
      await github.rest.pulls.listFiles({
        pull_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
      })
    ).data;

  return gitdifffiles;
}



module.exports = run;

async function main(readme) {
  return `Hi, I'm Orpheus Leap! Here to help you review your PR.
  ${await mainReal(readme)}
  Happy OnBoarding!
 <sub>This bot is a simpler helper for common submission types. If there's an error with this, please point it out and someone from the OnBoard team will look at it manually.</sub>`;
}
async function mainReal(readme) {
  console.error(readme);

  if (readme === 0) {
    return `Cannot find a file describing your project called "README.md".`;
  } else if (readme === 2) {
    return `Found multiple files named README.md. Please only provide one per PR. Make seperate PRs for multiple independent projects.`;
  } else if (readme) {
    // TODO add conditions
    return processREADME(readme);
    //return (await Promise.all(gerbers.map((g) => eachGerber(g)))).reduce((a,b) => a+b);
  } else {
    return "Unknown error with README detection";
  }
}

async function processREADME(readme) {
  var ans = `
****

Required files
||||
|---|---|---|
|✅| README.md | A description of your project |
|${(await hasCart(readme)) ? "✅" : "❌"} | cart.png | ${(await hasCart(readme))
      ? "![cart.png](<https://raw.githubusercontent.com/hackclub/OnBoard/" +
      (
      "/" +
      path.dirname(readme) +
      "/cart.png>)"
      : "You need to include a screenshot of your JLCPCB. Check out [these instructions](https://github.com/hackclub/OnBoard/blob/main/docs/ordering_from_JLCPCB.md#pcb-review). If you already have one, make sure it's a PNG file named exactly \"cart.png\"."
    } |`; // TODO: can we handle both png and jpg/jpeg??

  // let gerbers = await gerbersInDir(path.dirname(readme));

  if (gerbers.length === 0) {
    ans += `

**❌❌❌Cannot find a Gerber File. Please export a gerber from your PCB Design software and name it exactly "gerber.zip".**`;
  } else if (gerbers.length === 1) {
    ans += await eachGerber(gerbers[0]);
  } else {
    ans += "\n\nFormatting for multi-board projects not implemented yet."; //TODO
  }
  return ans;
}

async function gerbersInDir(readmepath) {
  //console.error(readmepath);
  //console.error(await fs.readdir(readmepath, {recursive: true}));
  // INFO: ALLEGEDLY NEEDS NODE 20
  return (await fs.readdir(readmepath, { recursive: true })).filter((f) => f.endsWith("gerber.zip")).map((f) => readmepath + "/" + f);
}

async function eachGerber(gerber) {
  if (!isValidGerber(gerber)) {
    return `
**${gerber}:**

	`;
  }
  let URL =
    `https://gerber.zip/2d/?mode=layers&boardUrl=https://raw.githubusercontent.com/hackclub/OnBoard/` +
    (
    "/" +
    gerber;
  let [srcstatus, srcsw, srcmessage] = await analyzeSourceFiles(gerber);

  return `
|${(await isValidGerber(gerber)) ? "✅" : "❌"}| gerber.zip | ${(await isValidGerber(gerber))
      ? ""
      : 'This gerber file is invalid. Please export a gerber from your PCB Design software (the same file you will submit to JLCPCB) and name it exactly "gerber.zip".'
    }|
|${(await hasSchematic(gerber)) ? "✅" : "❌"} | [schematic.pdf](<${rawPdfUrl}>) | ${(await hasSchematic(gerber)) ? `Manually check [schematic.pdf](<${rawPdfUrl}>)` : "You must export your schematic file as schematic.pdf"} |
|${srcstatus}| Source files - ${srcsw} | ${srcmessage} |

You can view a render of your board over on [gerber.zip/2d](<${URL}>)!
		`;
}



if (require.main === module) {
  main(process.argv[2]).then((r) => console.log(r));
}
