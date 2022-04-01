import * as vscode from 'vscode';

import * as fs from 'fs';
import { temp, schema } from './constants';

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

export function persistenceYaml(filename: string, content: string): string {

    fs.existsSync(temp) || fs.mkdirSync(temp);

    const yamlFilePath = `${temp}/tanka-${filename}.yaml`;
    fs.writeFileSync(yamlFilePath, content, { encoding: 'utf-8' });
    return yamlFilePath;
}

export function parseDiff(envName: string, diffContent: string) {

    const lines = diffContent.split(/\r?\n/).filter(l => !l.startsWith('diff -U'))
        .filter(l => !(l.startsWith('@@ ') && l.endsWith(' @@')))
        .filter(l => !(l.startsWith('+++') || l.startsWith('---')));

    const oldContent = lines.filter(l => !l.startsWith('+'))
        .map(l => l.substring(1))
        .join('\n');
    const newContent = lines.filter(l => !l.startsWith('-'))
        .map(l => l.substring(1))
        .join('\n');

    const fileNumber = getRandomInt(1000, 9999);

    const oldFilePath = persistenceYaml(`diff-${envName}-old-${fileNumber}`, oldContent);
    const newFilePath = persistenceYaml(`diff-${envName}-new-${fileNumber}`, newContent);

    return {
        oldUri: vscode.Uri.parse(`${schema}:${oldFilePath}`),
        newUri: vscode.Uri.parse(`${schema}:${newFilePath}`),
    };
}
