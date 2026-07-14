import fs from 'fs';
import path from 'path';
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
    throw new Error(
        "Knowledge graph not found. The MCP server does not generate the graph itself. " +
        "Please run the '/understand' skill using your agent to build the knowledge graph first."
    );
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
