import { useState, useMemo } from 'react';
import { Database, FolderTree, Info, Minus, Plus, Maximize } from 'lucide-react';
import { InferredModel } from '../lib/modeling/types';

interface EntityNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    data: any;
}

interface EntityLink {
    from: string;
    to: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

export default function EntityMapTab({ model }: { model: InferredModel }) {
    if (!model || !model.entities || model.entities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/10 rounded-2xl">
                <FolderTree className="w-12 h-12 text-gray-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Entity Map Available</h3>
                <p className="text-gray-400">Could not visualize database structure.</p>
            </div>
        );
    }

    const [zoom, setZoom] = useState(1);

    // Simple force-directed-like layout calculation (Static for MVP)
    const { nodes, links } = useMemo(() => {
        const nodes: EntityNode[] = [];
        const links: EntityLink[] = [];
        const gap = 300;
        const columns = 3;

        model.entities.forEach((entity: any, index: number) => {
            const row = Math.floor(index / columns);
            const col = index % columns;

            nodes.push({
                id: entity.tableName,
                x: col * gap + 100,
                y: row * gap * 0.8 + 100,
                width: 220,
                height: 100 + (entity.columns?.length || 0) * 20,
                data: entity
            });
        });

        model.relationships.forEach((rel: any) => {
            const source = nodes.find(n => n.id === rel.fromTable);
            const target = nodes.find(n => n.id === rel.toTable);

            if (source && target) {
                links.push({
                    from: rel.fromTable,
                    to: rel.toTable,
                    startX: source.x + source.width / 2,
                    startY: source.y + source.height / 2,
                    endX: target.x + target.width / 2,
                    endY: target.y + target.height / 2,
                });
            }
        });

        return { nodes, links };
    }, [model]);

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-[800px] overflow-hidden relative">
            <div className="absolute top-4 left-4 z-10">
                <h3 className="text-xl font-bold text-white font-serif">Entity Map</h3>
                <p className="text-sm text-gray-400">Visualizing {nodes.length} tables and {links.length} relationships</p>
            </div>

            <div className="w-full h-full overflow-auto bg-[#0a0a0a] rounded-xl border border-white/5 relative">
                <svg width={2000} height={2000} className="absolute top-0 left-0">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#4B5563" />
                        </marker>
                    </defs>

                    {/* Links */}
                    {links.map((link, i) => (
                        <path
                            key={i}
                            d={`M ${link.startX} ${link.startY} C ${link.startX + 100} ${link.startY}, ${link.endX - 100} ${link.endY}, ${link.endX} ${link.endY}`}
                            fill="none"
                            stroke="#4B5563"
                            strokeWidth="2"
                            markerEnd="url(#arrowhead)"
                        />
                    ))}

                    {/* Nodes */}
                    {nodes.map((node) => (
                        <foreignObject key={node.id} x={node.x} y={node.y} width={node.width} height={node.height} className="overflow-visible">
                            <div className="bg-gray-900 border border-teal-500/30 rounded-lg shadow-xl overflow-hidden hover:border-teal-500 transition-colors">
                                <div className="bg-teal-900/20 px-3 py-2 border-b border-white/10 flex justify-between items-center">
                                    <span className="text-sm font-bold text-teal-100 flex items-center gap-2">
                                        <Database className="w-3 h-3" />
                                        {node.id}
                                    </span>
                                </div>
                                <div className="p-3 space-y-1">
                                    {node.data.columns?.slice(0, 5).map((col: any) => (
                                        <div key={col.name} className="flex justify-between text-xs text-gray-400">
                                            <span>{col.name}</span>
                                            <span className="font-mono text-[10px] text-gray-600">{col.type}</span>
                                        </div>
                                    ))}
                                    {(node.data.columns?.length || 0) > 5 && (
                                        <div className="text-xs text-gray-600 pt-1 italic">
                                            + {node.data.columns.length - 5} more columns
                                        </div>
                                    )}
                                </div>
                            </div>
                        </foreignObject>
                    ))}
                </svg>
            </div>
        </div>
    );
}
