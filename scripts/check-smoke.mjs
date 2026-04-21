import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function readSourceFile(file) {
  const absolutePath = path.resolve(process.cwd(), file);

  if (!fs.existsSync(absolutePath)) {
    return {
      file,
      content: null,
      error: `file not found (${file})`,
    };
  }

  return {
    file,
    content: fs.readFileSync(absolutePath, 'utf8'),
    error: null,
  };
}

function validateConversationUnauthorizedGuard(content) {
  const sourceFile = ts.createSourceFile('route.ts', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  let hasClerkAuthDestructure = false;
  let hasUserIdGuard = false;
  let hasUnauthorized401Return = false;

  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)) {
      const elements = node.name.elements;
      const hasUserIdAliasedToClerk = elements.some((element) => {
        if (!ts.isBindingElement(element)) return false;
        if (!element.propertyName || !element.name) return false;
        return ts.isIdentifier(element.propertyName)
          && element.propertyName.text === 'userId'
          && ts.isIdentifier(element.name)
          && element.name.text === 'clerkUserId';
      });

      if (hasUserIdAliasedToClerk && node.initializer && ts.isAwaitExpression(node.initializer)) {
        const callExpr = node.initializer.expression;
        if (ts.isCallExpression(callExpr) && ts.isIdentifier(callExpr.expression) && callExpr.expression.text === 'auth') {
          hasClerkAuthDestructure = true;
        }
      }
    }

    if (ts.isIfStatement(node)
      && ts.isPrefixUnaryExpression(node.expression)
      && node.expression.operator === ts.SyntaxKind.ExclamationToken
      && ts.isIdentifier(node.expression.operand)
      && node.expression.operand.text === 'userId') {
      hasUserIdGuard = true;

      const branch = node.thenStatement;
      const returnStatement = ts.isBlock(branch)
        ? branch.statements.find((statement) => ts.isReturnStatement(statement))
        : ts.isReturnStatement(branch)
          ? branch
          : null;

      if (returnStatement?.expression && ts.isCallExpression(returnStatement.expression)) {
        const callExpressionText = returnStatement.expression.expression.getText(sourceFile);
        const fullReturnText = returnStatement.expression.getText(sourceFile);

        if (
          callExpressionText === 'NextResponse.json'
          && fullReturnText.includes("{ error: 'Unauthorized' }")
          && fullReturnText.includes('{ status: 401 }')
        ) {
          hasUnauthorized401Return = true;
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  const missing = [];
  if (!hasClerkAuthDestructure) {
    missing.push('const { userId: clerkUserId } = await auth();');
  }
  if (!hasUserIdGuard) {
    missing.push('if (!userId) { ... }');
  }
  if (!hasUnauthorized401Return) {
    missing.push("return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });");
  }

  return missing;
}

function validateMustContain(content, mustContain) {
  return mustContain.filter((needle) => !content.includes(needle));
}

const checks = [
  {
    name: '/api/conversation unauthorized path',
    file: 'src/app/api/conversation/route.ts',
    validate: validateConversationUnauthorizedGuard,
  },
  {
    name: 'cron auth guard',
    file: 'src/app/api/cron/decay/route.ts',
    mustContain: [
      "authHeader !== `Bearer ${env.CRON_SECRET}`",
      "return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });",
    ],
  },
  {
    name: 'webhook signature required',
    file: 'src/app/api/webhooks/clerk/route.ts',
    mustContain: [
      "const svix_signature = headerPayload.get('svix-signature');",
      "if (!svix_id || !svix_timestamp || !svix_signature)",
      'wh.verify(body, {',
      "return new Response('Invalid signature', { status: 400 });",
    ],
  },
];

let failed = false;

for (const check of checks) {
  const { content, error } = readSourceFile(check.file);

  if (error) {
    console.error(`❌ ${check.name}: ${error}`);
    failed = true;
    continue;
  }

  const missing = check.validate
    ? check.validate(content)
    : validateMustContain(content, check.mustContain || []);

  if (missing.length > 0) {
    console.error(`❌ ${check.name}: missing expected guard pattern(s) in ${check.file}`);
    for (const needle of missing) {
      console.error(`   - ${needle}`);
    }
    failed = true;
  } else {
    console.log(`✅ ${check.name}`);
  }
}

if (failed) {
  console.error('Smoke checks failed.');
  process.exit(1);
}

console.log('All smoke checks passed.');
