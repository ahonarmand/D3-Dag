import React, { useState, useEffect } from 'react';
import * as d3 from "d3";
import _ from "lodash"

interface InputDagNode {
  id: string
  displayName: string
}

interface InputEdge {
  sourceId: string
  targetId: string
}

interface DagNode {
  id: string
  displayName: string
  layerNumber: number
  x: number
  y: number
  scale?: number
}

class Edge {
  constructor(
    public sourceNode: DagNode,
    public targetNode: DagNode
  ){}

  getEdgeId(){
    return `edgeId_${this.sourceNode.id}_${this.targetNode.id}`
  }
}

interface D3DagProps {
  height: number
  width: number
  nodes: InputDagNode[]
  edges: InputEdge[]
}

class AdjacencyList implements Iterable<[string, string[]]> {
  nodes: InputDagNode[]
  edges: InputEdge[]
  decendents: Map<string, string[]>
  idToNode: Map<string, InputDagNode>

  constructor(nodes: InputDagNode[], edges: InputEdge[]) {
    this.nodes = nodes
    this.edges = edges
    this.decendents = new Map<string, string[]>()
    this.idToNode = new Map<string, InputDagNode>()
    this.createIdToNode()
    this.createAdjacencyList()
  }

  createIdToNode(){
    for(const node of this.nodes){
      this.idToNode.set(node.id, node)
    }
  }

  createAdjacencyList() {
    for(const e of this.edges) {
      if(!this.decendents.has(e.sourceId)){
        this.decendents.set(e.sourceId, [])
      }
      this.decendents.get(e.sourceId)?.push(e.targetId)
    }
  }

  getNodesDecendent(nodeId: string): string[] {
    const decendents = this.decendents.get(nodeId)
    return decendents ? decendents : []
  }

  [Symbol.iterator](): Iterator<[string, string[]]> {
    return this.decendents.entries()
  }

  getNodeById(nodeId: string): InputDagNode {
    const node = this.idToNode.get(nodeId)
    if(!node) throw Error(`invalid NodeId: ${nodeId}`)
    return node
  }
}


class InDegrees {
  inDegrees: Map<string, number>
  inputNodes: InputDagNode[]
  graph: AdjacencyList

  constructor(nodes: InputDagNode[], graph: AdjacencyList){
    this.inputNodes = nodes
    this.inDegrees = new Map<string, number>()
    this.graph = graph
    this.createIndegrees()
  }

  private getNodeInDegrees(nodeId: string, inDegrees: Map<string, number>): number {
    const inDegree = inDegrees.get(nodeId)
    if(inDegree != null) return inDegree
    return 0
  }

  private setNodeDegrees(nodeId: string, inDegree: number, inDegrees: Map<string, number>){
    inDegrees.set(nodeId, inDegree)
  }

  private decrementNodeDegrees(nodeId: string, inDegrees: Map<string, number>){
    const currentInDegrees = this.getNodeInDegrees(nodeId, inDegrees)
    this.setNodeDegrees(nodeId, currentInDegrees-1, inDegrees)
  }

  private createIndegrees() {
    for(const node of this.inputNodes){
      this.inDegrees.set(node.id, 0)
    }

    for(const [nodeId, neighbors] of this.graph){
      neighbors.forEach(neightborId => {
        this.setNodeDegrees(
          neightborId,
          this.getNodeInDegrees(neightborId, this.inDegrees) + 1,
          this.inDegrees
        )
      })
    }
  }

  private getNodesWithNoInDegrees(inDegrees: Map<string, number>): string[] {
    const ans = [] as string[]
    for(const [nodeId, inDegree] of inDegrees.entries()){
      if(inDegree === 0){
        this.setNodeDegrees(nodeId, -1, inDegrees)
        ans.push(nodeId)
      }
    }
    return ans
  }

  getLayers(): Map<number, InputDagNode[]> {
    const inDegreesCopy = new Map(this.inDegrees)
    const layers = new Map<number, InputDagNode[]>()

    for(let layer=0 ; layer < this.inputNodes.length ; layer++){
      console.log(`layer: ${layer}`);  
      for(const nodeId of this.getNodesWithNoInDegrees(inDegreesCopy)) {
        console.log(`nodeID: ${nodeId}`);
        const nodesInCurrentLayer = layers.get(layer) ? layers.get(layer)! : []
        layers.set(layer, [...nodesInCurrentLayer, this.graph.getNodeById(nodeId)])
        this.graph.getNodesDecendent(nodeId).forEach(decendentId => this.decrementNodeDegrees(decendentId, inDegreesCopy) )
      }
    }
    return layers
  }
}


function _topologicalSort(nodes: InputDagNode[], edges: InputEdge[]): Map<number, InputDagNode[]> {
    const adjacencyList = new AdjacencyList(nodes, edges)
    const inDegrees = new InDegrees(nodes, adjacencyList)

    const layers = inDegrees.getLayers()
    
    for(const [layer, nodes] of layers){
      console.log(layer)
      console.log(nodes)
      console.log("---")
    }
    return layers
}

class NodesPositioning {
  layers: Map<number, InputDagNode[]>
  nodesWithPositions: DagNode[] = []
  height: number
  width: number

  constructor(layers: Map<number, InputDagNode[]>, height: number, width: number) {
    this.layers = layers
    this.height = height
    this.width = width
    this.assignPositionToNodes()
  }

  assignPositionToNodes(){
    const layerDistance = this.width / (this.layers.size + 1)
    
    for(const [layer, nodes] of this.layers){
      const distanceToNodesInLayer = this.height / (nodes.length + 1)
      for(let i=0 ; i<nodes.length ; i++) {
        const node = nodes[i]
        this.nodesWithPositions.push({
          id: node.id,
          displayName: node.displayName,
          layerNumber: layer,
          x: layerDistance * (layer+1),
          y: distanceToNodesInLayer * (i+1)
        })
      }
    }
  }

  getNodesWithPositions(): DagNode[] {
    return this.nodesWithPositions
  }

  getEdgesAsNodePairs(edges: InputEdge[]): Edge[] {
    const idToDagNode = _.keyBy(this.nodesWithPositions, x => x.id)
    return edges.map(({sourceId, targetId}) => new Edge(idToDagNode[sourceId], idToDagNode[targetId]))
  }
}


function D3Dag({height, width, nodes, edges}: D3DagProps) {

  const layers: Map<number, InputDagNode[]> = _topologicalSort(nodes, edges)

  const nodePositions = new NodesPositioning(layers, height, width)
  const nodesWithPositions = nodePositions.getNodesWithPositions()
  const edgesAsNodePairs = nodePositions.getEdgesAsNodePairs(edges)

  console.log(`nodes with positions:`);
  console.log(nodesWithPositions)

  const myRef = React.createRef<HTMLDivElement>();
  const graphRef = React.createRef<HTMLDivElement>();

  const [clicked, addRemoveClicked] = useState(new Set())

  function toggleClicked(id: string) {
    console.log(`in toggleClicked`);
    addRemoveClicked((prevClicked) => {
      console.log(`prev`);
      console.log(prevClicked);
      if(prevClicked.has(id)){
        prevClicked.delete(id)
        return prevClicked
      } else{
        prevClicked.add(id)
        return prevClicked
      }
    })
  }

  console.log(`here 1`);
  useEffect(() => {
    // Update the document title using the browser API
    if(myRef.current == null)
      return
    myRef.current.innerHTML = "inneerHTML"
    // myRef.innerHTML = `You clicked times`;

    console.log(`in useEffect`);
    const vis = d3.select("#graph").append("svg:svg")
    vis.attr("width", width).attr("height", height)
      .style("background-color", "pink")

    const rectHeight = 20
    const rectWidth = 40

    const rectText = vis.selectAll("g .nodes")
     .data(nodesWithPositions)
     .enter()
     .append('g')
     .attr("transform", `translate(3, ${-1 * rectHeight/2})`)

    rectText
      .append('rect')
      .attr("x", n => n.x)
      .attr("y", n => n.y)
      .attr("width", 40)
      .attr("height", 20)
      .style("fill", "blue")
      .style("opacity", 0.3)

    rectText
     .append("text")
     .text(d => d.displayName)
     .attr("class", "nodes")
     .attr("x", function(node) { return node.x; })
     .attr("y", function(node) { return node.y; })
     .attr("transform", `translate(3, ${rectHeight/1.5})`)
     .each( function(x: DagNode) {
       x.scale = Math.min(rectWidth / this.getBBox().width, rectHeight / this.getBBox().height)
     })
     .style("font-size", d => {
       console.log(`s.scale: ${d.scale}`);
       return d.scale ? d.scale*13 + "px" : 13
      })
     .style("fill", "black")
     .on("click", (element, datum) => {
       const x = datum as unknown as InputDagNode
        console.log(x)
        toggleClicked(x.id)
     })

     vis.selectAll("marker")
      .data(edgesAsNodePairs)
      .enter()
      .append("svg:marker")
      .attr('id', function(d){ return `marker_${d.getEdgeId()}`})
      .attr('markerHeight', 13)
      .attr('markerWidth', 13)
      .attr('markerUnits', 'strokeWidth')
      .attr('orient', 'auto')   // this will make sure that the marker autorotates based on the line referencing it
      .attr('refX', 2)
      .attr('refY', 6)
      .append('svg:path')
        .attr('d', function(d){ return "M2,4 L2,8 L5,6 Z" })
        .attr('fill', function(d,i) { return "black"});


     vis.selectAll(".line")
      .data(edgesAsNodePairs)
      .enter()
      .append("line")
      .attr("x1", function(e) { return e.sourceNode.x })
      .attr("y1", function(e) { return e.sourceNode.y })
      .attr("x2", function(e) { return e.targetNode.x })
      .attr("y2", function(e) { return e.targetNode.y })
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round')
      .attr('marker-end', function(d,i){ return `url(#marker_${d.getEdgeId()})` })
      .style("stroke", "black");


  });

  console.log(`here 2`);

  return (
    <>
      <div ref={myRef} id="X"> "hi" </div>
      <div ref={graphRef} id="graph"></div>
    </>
  )
}

export default D3Dag;