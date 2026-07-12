import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import chokidar from 'chokidar';
import { config } from '../config.js';

let knowledgeGraph: any = null;

export async function initializeUnderstand(): Promise<void> {
    const graphPath = path.join(config.projectPath, 'knowledge-graph.json');
    
    if (!fs.existsSync(graphPath)) {
        await forceScan();
    }

    loadGraph(graphPath);

    chokidar.watch(graphPath).on('change', () => {
        console.error('knowledge-graph.json changed, reloading...');
        loadGraph(graphPath);
    });
}

export async function forceScan(): Promise<void> {
    const graphPath = path.join(config.projectPath, 'knowledge-graph.json');
    console.error('Running npx @egonex/understand-anything...');
    await new Promise<void>((resolve, reject) => {
        exec('npx @egonex/understand-anything', { cwd: config.projectPath }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error running understand-anything: ${error.message}`);
                return reject(error);
            }
            console.error('Successfully generated knowledge-graph.json');
            resolve();
        });
    });
    loadGraph(graphPath);
}



function loadGraph(graphPath: string) {
    try {
        if (fs.existsSync(graphPath)) {
            const data = fs.readFileSync(graphPath, 'utf8');
            knowledgeGraph = JSON.parse(data);
            console.error('Knowledge graph loaded successfully.');
        }
    } catch (error) {
        console.error('Failed to parse knowledge-graph.json:', error);
    }
}

export function getGraph() {
    return knowledgeGraph;
}
