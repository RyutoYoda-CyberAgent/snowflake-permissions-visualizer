class SnowflakePermissionsVisualizer {
    constructor() {
        this.data = null;
        this.nodes = [];
        this.links = [];
        this.filteredNodes = [];
        this.filteredLinks = [];
        this.selectedNode = null;
        
        this.width = 1200;
        this.height = 600;
        
        this.svg = d3.select("#visualization")
            .attr("width", this.width)
            .attr("height", this.height);
        
        this.g = this.svg.append("g");
        
        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .force("collision", d3.forceCollide().radius(30));
        
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on("zoom", (event) => {
                this.g.attr("transform", event.transform);
            });
        
        this.svg.call(this.zoom);
        
        this.tooltip = d3.select("#tooltip");
        
        this.setupEventListeners();
        this.loadPermissionsData();
    }
    
    setupEventListeners() {
        d3.select("#viewFilter").on("change", () => this.applyFilters());
        d3.select("#searchInput").on("input", () => this.applyFilters());
    }
    
    async loadPermissionsData() {
        try {
            this.showStatus("データを読み込み中...", "loading");
            
            // Try to load from JSON file first
            const response = await fetch("permissions_data.json");
            if (response.ok) {
                this.data = await response.json();
                this.processData();
                this.showStatus("データが正常に読み込まれました", "success");
                this.startAutoRefresh();
            } else {
                // If no JSON file, create sample data
                this.createSampleData();
                this.showStatus("サンプルデータを表示中 (permissions_data.jsonが見つかりません)", "error");
            }
        } catch (error) {
            console.error("Error loading data:", error);
            this.createSampleData();
            this.showStatus("サンプルデータを表示中 (データ読み込みエラー)", "error");
        }
    }
    
    startAutoRefresh() {
        // Check for updates every 30 seconds
        setInterval(async () => {
            try {
                const response = await fetch("http://localhost:8081/update-notification");
                if (response.ok) {
                    const notification = await response.json();
                    if (notification.message !== "No updates") {
                        this.showStatus("新しいデータが検出されました。更新中...", "loading");
                        await this.loadPermissionsData();
                    }
                }
            } catch (error) {
                // Auto-refresh service not available, continue silently
            }
        }, 30000);
    }
    
    createSampleData() {
        this.data = {
            timestamp: new Date().toISOString(),
            roles: [
                { name: "ACCOUNTADMIN", comment: "Account administrator role" },
                { name: "SYSADMIN", comment: "System administrator role" },
                { name: "USERADMIN", comment: "User administrator role" },
                { name: "PUBLIC", comment: "Default public role" },
                { name: "DATA_ANALYST", comment: "Data analyst role" },
                { name: "DATA_ENGINEER", comment: "Data engineer role" }
            ],
            users: [
                { name: "ADMIN_USER", email: "admin@company.com" },
                { name: "ANALYST_USER", email: "analyst@company.com" },
                { name: "ENGINEER_USER", email: "engineer@company.com" },
                { name: "READONLY_USER", email: "readonly@company.com" }
            ],
            databases: [
                { name: "PROD_DB", comment: "Production database" },
                { name: "DEV_DB", comment: "Development database" },
                { name: "ANALYTICS_DB", comment: "Analytics database" }
            ],
            role_grants: {
                "DATA_ANALYST": [
                    { privilege: "SELECT", granted_on: "TABLE", name: "PROD_DB.SCHEMA1.USERS" },
                    { privilege: "SELECT", granted_on: "TABLE", name: "ANALYTICS_DB.PUBLIC.REPORTS" }
                ],
                "DATA_ENGINEER": [
                    { privilege: "ALL", granted_on: "DATABASE", name: "DEV_DB" },
                    { privilege: "INSERT", granted_on: "TABLE", name: "PROD_DB.SCHEMA1.LOGS" }
                ]
            },
            user_grants: {
                "ANALYST_USER": [
                    { role: "DATA_ANALYST", granted_by: "USERADMIN" },
                    { role: "PUBLIC", granted_by: "USERADMIN" }
                ],
                "ENGINEER_USER": [
                    { role: "DATA_ENGINEER", granted_by: "USERADMIN" },
                    { role: "PUBLIC", granted_by: "USERADMIN" }
                ]
            },
            role_memberships: {
                "DATA_ANALYST": [
                    { grantee_name: "ANALYST_USER", granted_by: "USERADMIN" }
                ],
                "DATA_ENGINEER": [
                    { grantee_name: "ENGINEER_USER", granted_by: "USERADMIN" }
                ]
            },
            table_grants: {}
        };
        
        this.processData();
    }
    
    processData() {
        this.nodes = [];
        this.links = [];
        
        // Create nodes for users
        this.data.users.forEach(user => {
            this.nodes.push({
                id: `user_${user.name}`,
                name: user.name,
                type: "user",
                data: user
            });
        });
        
        // Create nodes for roles
        this.data.roles.forEach(role => {
            this.nodes.push({
                id: `role_${role.name}`,
                name: role.name,
                type: "role",
                data: role
            });
        });
        
        // Create nodes for databases
        this.data.databases.forEach(db => {
            this.nodes.push({
                id: `db_${db.name}`,
                name: db.name,
                type: "database",
                data: db
            });
        });
        
        // Create links for user-role relationships
        Object.entries(this.data.user_grants || {}).forEach(([userName, grants]) => {
            grants.forEach(grant => {
                if (grant.role) {
                    this.links.push({
                        source: `user_${userName}`,
                        target: `role_${grant.role}`,
                        type: "membership",
                        data: grant
                    });
                }
            });
        });
        
        // Create links for role-permission relationships
        Object.entries(this.data.role_grants || {}).forEach(([roleName, grants]) => {
            grants.forEach(grant => {
                let targetId;
                if (grant.granted_on === "DATABASE") {
                    targetId = `db_${grant.name}`;
                } else if (grant.granted_on === "TABLE") {
                    // Extract database name from table name
                    const dbName = grant.name.split('.')[0];
                    targetId = `db_${dbName}`;
                }
                
                if (targetId) {
                    this.links.push({
                        source: `role_${roleName}`,
                        target: targetId,
                        type: "grant",
                        data: grant
                    });
                }
            });
        });
        
        this.applyFilters();
        this.updateVisualization();
    }
    
    applyFilters() {
        const viewFilter = d3.select("#viewFilter").property("value");
        const searchTerm = d3.select("#searchInput").property("value").toLowerCase();
        
        // Filter nodes
        this.filteredNodes = this.nodes.filter(node => {
            let typeMatch = true;
            if (viewFilter === "users") typeMatch = node.type === "user";
            else if (viewFilter === "roles") typeMatch = node.type === "role";
            else if (viewFilter === "tables") typeMatch = node.type === "table" || node.type === "database";
            
            let searchMatch = true;
            if (searchTerm) {
                searchMatch = node.name.toLowerCase().includes(searchTerm);
            }
            
            return typeMatch && searchMatch;
        });
        
        // Filter links to only include those between filtered nodes
        const nodeIds = new Set(this.filteredNodes.map(n => n.id));
        this.filteredLinks = this.links.filter(link => 
            nodeIds.has(link.source.id || link.source) && 
            nodeIds.has(link.target.id || link.target)
        );
        
        this.updateVisualization();
    }
    
    updateVisualization() {
        // Clear previous elements
        this.g.selectAll("*").remove();
        
        // Create links
        const link = this.g.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(this.filteredLinks)
            .enter().append("line")
            .attr("class", d => `link ${d.type}`)
            .attr("stroke-width", d => d.type === "grant" ? 3 : 2);
        
        // Create nodes
        const node = this.g.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(this.filteredNodes)
            .enter().append("g")
            .attr("class", "node-group")
            .call(d3.drag()
                .on("start", (event, d) => this.dragstarted(event, d))
                .on("drag", (event, d) => this.dragged(event, d))
                .on("end", (event, d) => this.dragended(event, d)));
        
        // Add circles to nodes
        node.append("circle")
            .attr("class", d => `node ${d.type}`)
            .attr("r", d => {
                switch(d.type) {
                    case "user": return 15;
                    case "role": return 12;
                    case "database": return 18;
                    case "table": return 10;
                    default: return 12;
                }
            })
            .on("click", (event, d) => this.selectNode(d))
            .on("mouseover", (event, d) => this.showTooltip(event, d))
            .on("mouseout", () => this.hideTooltip());
        
        // Add labels to nodes
        node.append("text")
            .attr("dy", 25)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "#e0e0e0")
            .text(d => d.name.length > 12 ? d.name.substring(0, 12) + "..." : d.name);
        
        // Update simulation
        this.simulation
            .nodes(this.filteredNodes)
            .on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);
                
                node
                    .attr("transform", d => `translate(${d.x},${d.y})`);
            });
        
        this.simulation.force("link")
            .links(this.filteredLinks);
        
        this.simulation.alpha(1).restart();
    }
    
    selectNode(node) {
        // Remove previous selection
        this.g.selectAll(".node").classed("selected", false);
        
        // Add selection to clicked node
        this.g.selectAll(".node")
            .filter(d => d.id === node.id)
            .classed("selected", true);
        
        this.selectedNode = node;
        this.updateInfoPanel(node);
        
        // Automatically highlight connected paths when a node is selected
        this.highlightConnectedNodes(node);
    }
    
    updateInfoPanel(node) {
        const infoPanel = d3.select("#nodeInfo");
        
        let content = `<h5>${node.name}</h5>`;
        content += `<p><strong>タイプ:</strong> ${this.getTypeLabel(node.type)}</p>`;
        
        if (node.data) {
            if (node.type === "user" && node.data.email) {
                content += `<p><strong>メール:</strong> ${node.data.email}</p>`;
            }
            if (node.data.comment) {
                content += `<p><strong>説明:</strong> ${node.data.comment}</p>`;
            }
        }
        
        // Show all related permissions for users (up to ~15 items)
        const relatedLinks = this.links.filter(link => 
            link.source === node.id || link.target === node.id ||
            (link.source.id && link.source.id === node.id) ||
            (link.target.id && link.target.id === node.id)
        );
        
        if (relatedLinks.length > 0) {
            content += `<h6>関連権限 (${relatedLinks.length}件):</h6>`;
            content += `<ul>`;
            
            // Show all permissions for users (they typically have fewer than 15)
            const maxItems = node.type === "user" ? relatedLinks.length : Math.min(relatedLinks.length, 10);
            
            for (let i = 0; i < maxItems; i++) {
                const link = relatedLinks[i];
                const sourceId = link.source.id || link.source;
                const targetId = link.target.id || link.target;
                const otherNodeId = sourceId === node.id ? targetId : sourceId;
                const otherNode = this.filteredNodes.find(n => n.id === otherNodeId);
                
                if (otherNode) {
                    content += `<li><strong>${this.getTypeLabel(link.type)}:</strong> ${otherNode.name}`;
                    if (link.data && link.data.privilege) {
                        content += ` <em>(${link.data.privilege})</em>`;
                    }
                    if (link.data && link.data.role) {
                        content += ` <em>(${link.data.role})</em>`;
                    }
                    if (link.data && link.data.granted_by) {
                        content += ` <small>by ${link.data.granted_by}</small>`;
                    }
                    content += `</li>`;
                }
            }
            
            if (relatedLinks.length > maxItems) {
                content += `<li><em>... 他 ${relatedLinks.length - maxItems} 件</em></li>`;
            }
            
            content += `</ul>`;
            
            // Show additional details for users
            if (node.type === "user" && this.data) {
                // Show user grants details
                const userGrants = this.data.user_grants && this.data.user_grants[node.name];
                if (userGrants && userGrants.length > 0) {
                    content += `<h6>ロール割り当て:</h6>`;
                    content += `<ul>`;
                    userGrants.forEach(grant => {
                        content += `<li><strong>${grant.role}</strong>`;
                        if (grant.granted_by) {
                            content += ` <small>(付与者: ${grant.granted_by})</small>`;
                        }
                        content += `</li>`;
                    });
                    content += `</ul>`;
                }
            }
        }
        
        infoPanel.html(content);
    }
    
    getTypeLabel(type) {
        const labels = {
            "user": "ユーザー",
            "role": "ロール",
            "database": "データベース",
            "table": "テーブル"
        };
        return labels[type] || type;
    }
    
    showTooltip(event, node) {
        this.tooltip
            .style("opacity", 1)
            .html(`
                <strong>${node.name}</strong><br>
                タイプ: ${this.getTypeLabel(node.type)}<br>
                ${node.data && node.data.comment ? `説明: ${node.data.comment}` : ""}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    }
    
    hideTooltip() {
        this.tooltip.style("opacity", 0);
    }
    
    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    
    showStatus(message, type) {
        const status = d3.select("#status");
        status
            .attr("class", `status ${type}`)
            .text(message);
        
        if (type === "success") {
            setTimeout(() => {
                status.style("display", "none");
            }, 3000);
        }
    }
    
    toggleDetailedView() {
        this.detailedView = !this.detailedView;
        this.updateVisualization();
    }
    
    highlightConnectedNodes(node) {
        // Clear previous highlights
        this.clearHighlights();
        
        // Get connected nodes and links
        const connectedNodes = new Set([node.id]);
        const connectedLinks = [];
        
        this.filteredLinks.forEach(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            
            if (sourceId === node.id || targetId === node.id) {
                connectedNodes.add(sourceId);
                connectedNodes.add(targetId);
                connectedLinks.push(link);
            }
        });
        
        // Make unconnected nodes almost invisible
        this.g.selectAll(".node")
            .style("opacity", d => connectedNodes.has(d.id) ? 1 : 0.1)
            .style("filter", d => connectedNodes.has(d.id) ? "none" : "grayscale(80%)");
        
        // Make unconnected node labels invisible
        this.g.selectAll("text")
            .style("opacity", d => connectedNodes.has(d.id) ? 1 : 0.1);
        
        // Hide unconnected links completely and make connected links glow
        this.g.selectAll(".link")
            .style("opacity", d => {
                const sourceId = d.source.id || d.source;
                const targetId = d.target.id || d.target;
                return (sourceId === node.id || targetId === node.id) ? 1 : 0;
            })
            .style("stroke-width", d => {
                const sourceId = d.source.id || d.source;
                const targetId = d.target.id || d.target;
                return (sourceId === node.id || targetId === node.id) ? 5 : 2;
            })
            .style("filter", d => {
                const sourceId = d.source.id || d.source;
                const targetId = d.target.id || d.target;
                return (sourceId === node.id || targetId === node.id) ? "drop-shadow(0 0 6px currentColor)" : "none";
            });
        
        // Update info panel with path information
        this.updatePathInfo(node, connectedLinks);
    }
    
    clearHighlights() {
        this.g.selectAll(".node")
            .style("opacity", 1)
            .style("filter", "none");
        
        this.g.selectAll("text")
            .style("opacity", 1);
        
        this.g.selectAll(".link")
            .style("opacity", 0.6)
            .style("stroke-width", d => d.type === "grant" ? 3 : 2)
            .style("filter", "none");
    }
    
    updatePathInfo(node, connectedLinks) {
        const infoPanel = d3.select("#nodeInfo");
        
        let content = `<h5>${node.name}</h5>`;
        content += `<p><strong>タイプ:</strong> ${this.getTypeLabel(node.type)}</p>`;
        
        if (connectedLinks.length > 0) {
            content += `<h6>接続された権限:</h6>`;
            content += `<ul>`;
            
            connectedLinks.forEach(link => {
                const sourceId = link.source.id || link.source;
                const targetId = link.target.id || link.target;
                const otherNodeId = sourceId === node.id ? targetId : sourceId;
                const otherNode = this.filteredNodes.find(n => n.id === otherNodeId);
                
                if (otherNode) {
                    content += `<li>${this.getTypeLabel(link.type)}: ${otherNode.name}`;
                    if (link.data && link.data.privilege) {
                        content += ` (${link.data.privilege})`;
                    }
                    content += `</li>`;
                }
            });
            
            content += `</ul>`;
        }
        
        infoPanel.html(content);
    }
}

// Global functions for HTML buttons
function loadPermissionsData() {
    visualizer.loadPermissionsData();
}

function resetVisualization() {
    // Reset zoom and center the view
    visualizer.svg.transition().duration(750).call(
        visualizer.zoom.transform,
        d3.zoomIdentity.translate(visualizer.width / 2, visualizer.height / 2).scale(1)
    );
    
    // Reset filters and search
    d3.select("#viewFilter").property("value", "all");
    d3.select("#searchInput").property("value", "");
    
    // Clear highlights first
    visualizer.clearHighlights();
    
    // Reapply filters and restart simulation to center nodes
    visualizer.applyFilters();
    
    // Reset node positions to center and restart simulation
    visualizer.filteredNodes.forEach(node => {
        delete node.fx;
        delete node.fy;
        node.x = visualizer.width / 2 + (Math.random() - 0.5) * 100;
        node.y = visualizer.height / 2 + (Math.random() - 0.5) * 100;
    });
    
    // Restart simulation with higher alpha for repositioning
    visualizer.simulation
        .force("center", d3.forceCenter(visualizer.width / 2, visualizer.height / 2))
        .alpha(1)
        .restart();
}

function exportData() {
    if (visualizer.data) {
        const dataStr = JSON.stringify(visualizer.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `snowflake_permissions_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
}

function toggleNodeDetails() {
    visualizer.toggleDetailedView();
}

function clearHighlights() {
    visualizer.clearHighlights();
}

// Initialize the visualizer
let visualizer;
document.addEventListener("DOMContentLoaded", function() {
    visualizer = new SnowflakePermissionsVisualizer();
});