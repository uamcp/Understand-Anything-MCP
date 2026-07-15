import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { config } from '../config.js';

let knowledgeGraph: any = null;

export async function initializeUnderstand(): Promise<void> {
    let graphPath = path.join(config.projectPath, '.ua', 'knowledge-graph.json');
    
    if (!fs.existsSync(graphPath)) {
        const legacyPath = path.join(config.projectPath, '.understand-anything', 'knowledge-graph.json');
        if (fs.existsSync(legacyPath)) {
            graphPath = legacyPath;
        }
    }

    loadGraph(graphPath);

    chokidar.watch(graphPath).on('all', (event) => {
        if (event === 'add' || event === 'change') {
            console.error('knowledge-graph.json changed or added, reloading...');
            loadGraph(graphPath);
        }
    });
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
