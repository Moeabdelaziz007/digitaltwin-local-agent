import fs from 'fs';
import path from 'path';

/**
 * scripts/generate-contracts.ts
 * Auto-generates TypeScript interfaces from pb_schema.json.
 */

const SCHEMA_PATH = path.join(process.cwd(), 'pb_schema.json');
const OUTPUT_PATH = path.join(process.cwd(), 'src/types/pb-contracts.ts');

interface PBField {
  name: string;
  type: string;
  required: boolean;
}

interface PBCollection {
  name: string;
  schema: PBField[];
}

function pbTypeToTS(type: string): string {
  switch (type) {
    case 'text':
    case 'email':
    case 'url':
    case 'date':
      return 'string';
    case 'number':
      return 'number';
    case 'bool':
      return 'boolean';
    case 'json':
      return 'any';
    case 'relation':
      return 'string'; // ID of related record
    case 'file':
      return 'string'; // Filename
    case 'select':
      return 'string';
    default:
      return 'any';
  }
}

function toPascalCase(str: string): string {
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function generate() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error('pb_schema.json not found!');
    return;
  }

  const schema: PBCollection[] = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  
  let output = `/**\n * AUTO-GENERATED FROM pb_schema.json\n * DO NOT EDIT DIRECTLY\n */\n\n`;

  schema.forEach(col => {
    const interfaceName = toPascalCase(col.name);
    output += `export interface ${interfaceName} {\n`;
    output += `  id: string;\n`;
    output += `  created: string;\n`;
    output += `  updated: string;\n`;
    
    col.schema.forEach(field => {
      const tsType = pbTypeToTS(field.type);
      const optional = field.required ? '' : '?';
      output += `  ${field.name}${optional}: ${tsType};\n`;
    });
    
    output += `}\n\n`;
  });

  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(`✅ Contracts generated at ${OUTPUT_PATH}`);
}

generate();
