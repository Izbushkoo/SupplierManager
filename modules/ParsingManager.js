import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'fs';

export function parseXMLToJSON(supplierName) {
  const xmlFile = readFileSync(`${process.cwd()}/xml/${supplierName}.xml`, 'utf8');
  const options = {
    ignoreDeclaration: true,
    ignoreAttributes: false,
    attributesGroupName: "basicProductStats",
    attributeNamePrefix: "",
    cdataPositionChar: "^",
    numberParseOptions: {
      leadingZeros: false
    },
  };
  const parser = new XMLParser(options);
  const jsonFromXML = parser.parse(xmlFile);

  return jsonFromXML
}