const dashDimensions = [8, 5];
const header = 0;
const rectHeight = 50;
const rectWidth = 160;
const verticalMargin = 15;
const horizontalMargin = 35;
const offset = 28;
const horizontalDivision = 100;
const gap = 4;

function decrement_refcount_dagre(n, g, depth = 0) {

  if (path.includes(n.data.id))
  {
    return;
  }
  path.push(n.data.id);

  for (const e of g.outEdges(n.data.id))
  {
    g.edge(e).data.hidden = true;
  }

  if (depth == 0 || n.data.active)
    for (const c of g.successors(n.data.id))
    {
      let child = g.node(c);
      if (child.data.id === 17) {
        console.log(`Node 17, RefCount: ${child.data.refCount}`);
      }
      if (child.data.refCount > 0) {
        --child.data.refCount;
        child.data.hidden = (child.data.refCount === 0);
        if (child.data.hidden)
        {
          for(const e of g.outEdges(c))
          {
            g.edge(e).data.hidden = true;
          }
          decrement_refcount_dagre(child, g, depth + 1);
        }
        if (child.data.id === 17) {
          console.log(`RefCount: ${child.data.refCount}`);
        }
      }
    }
  path.pop();
}


function increment_refcount_dagre(n, g, depth = 0) {
  if (path.includes(n.data.id))
  {
    return;
  }
  path.push(n.data.id);

  for(const c of g.successors(n.data.id))
  {
    let child = g.node(c)
    const originalVisibility = child.data.hidden;
    ++child.data.refCount;
    child.data.hidden = (child.data.refCount === 0);

    if (originalVisibility != child.data.hidden && child.data.active) 
    {
      /* If node just popped up, propogate references to children */
      increment_refcount_dagre(child, g, depth + 1);

      /* If node just popped up, show all parent edges from nodes not hidden */
      const dagNodes = dag.nodes();
      for (const incomingEdge of g.inEdges(c))
      {
        const sourceNodeId = g.edge(incomingEdge).data.source;
        const node = g.node(dagNodes.find(node => g.node(node).data.id === sourceNodeId));
        if (!node.data.hidden && node.data.active)
        {
          g.edge(incomingEdge).data.hidden = false;
        }
      }
      
      /* If node just popped up, show all child edges to nodes not hidden */
      for (const outgoingEdge of g.outEdges(c))
      {
        const targetNodeId = g.edge(outgoingEdge).data.target;
        const node = g.node(dagNodes.find(node => g.node(node).data.id === targetNodeId));
        if (!node.data.hidden && node.data.active)
        {
          g.edge(outgoingEdge).data.hidden = false;
        }
      }
    } 
  else 
    {
      const incomingEdge = g.inEdges(c).find(edge => g.edge(edge).data.source === n.data.id);
      g.edge(incomingEdge).data.hidden = false;
    }
  }
  path.pop();
}

function click_dagre(n, dag, svgID) {
  console.log(`you are clicking on node ${n.data.id}`);

  if (n.data.active === undefined) {
    return;
  }

  if (n.data.hidden) {
    /* You can't click on hidden nodes */
    return;
  }

  n.data.active = !n.data.active;
  if (n.data.active) {
    increment_refcount_dagre(n, dag);
  } else {
    decrement_refcount_dagre(n, dag);
  }
  n.data['first_click'] = false;
  visualizeDAG_dagre(dag, svgID)
}


function setupSVG(svgID) {

  const svg = d3.select(svgID);

  // Define an arrowhead marker for directed edges
  let arrowhead = svg.select('#arrowhead')
  if(arrowhead.empty()){
    svg.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('refX', 6) 
    .attr('refY', 2) 
    .attr('markerWidth', 10) 
    .attr('markerHeight', 10) 
    .attr('orient', 'auto-start-reverse') 
    .append('path')
    .attr('d', 'M 0,0 V 4 L6,2 Z');
  }

  // clear contents everytime
  svg.select('#links').html('');
  svg.select('#nodes').html('');
  d3.select('#data-race-buttons').html('');
}

function computeConnectingLineCoords(data, index, type)
{
  const numFlags = numberOfFlagTypes(data.flag);
  let offset = 0;

  if (numFlags > 1)
  {
    if (type === 'to/from')
    {
      offset = -8;
    }
    else if (type === 'assoc')
    {
      offset = 8;
    }
  }

  let startingPoint = [ computeAlignmentHost() + rectWidth + gap, (rectHeight / 2) + header + (index * (verticalMargin + rectHeight)) + offset];
  let endingPoint = [ computeAlignmentTarget() - gap, (rectHeight / 2) + header + (index * (verticalMargin + rectHeight)) + offset];
  if (isFromDataMovement(data.flag))
  {
    let swap = startingPoint;
    startingPoint = endingPoint;
    endingPoint = swap;
  }
  return [startingPoint, endingPoint];
}

function computeSVGWidth() {
  return computeAlignmentTarget() + rectWidth;
}

function computeSVGHeight(n) {
  return (n * rectHeight + Math.max(0, (n - 1)) * verticalMargin);
}

function computeAlignmentHost() {
  const hostHeader = document.getElementById('memory-vis-header-host');
  return (hostHeader.offsetWidth - rectWidth) / 2;
}

function computeAlignmentTarget() {
  const hostHeader = document.getElementById('memory-vis-header-host');
  const divider = document.getElementById('memory-vis-header-gap');
  const targetHeader = document.getElementById('memory-vis-header-target');
  return hostHeader.offsetWidth + divider.offsetWidth + (targetHeader.offsetWidth - rectWidth) / 2;
}

function computeAlignmentMovementLabel(label) {
  const horizontalOffset = 2;
  const hostHeader = document.getElementById('memory-vis-header-host');
  const divider = document.getElementById('memory-vis-header-gap');
  return hostHeader.offsetWidth + (divider.offsetWidth / 2) - (label.length * horizontalOffset);
}

function isMovementFrameLargeEnough() {
  const subheadingDiv = document.getElementById('memory-vis-header-subheading');
  return subheadingDiv.offsetWidth >= 2 * gap + 2 * rectWidth + horizontalDivision;
}

function initializeSVG(n) {
  const svg = d3.select('#memory-vis-display');
  const svgWidth = computeSVGWidth();
  const svgHeight = computeSVGHeight(n);
  
  svg.attr('viewBox', '0 0 ' + svgWidth + ' ' + svgHeight);
  svg.attr('width', svgWidth);
  svg.attr('height', svgHeight);
  return svg;
}

function transitionHeader(opening) {
  const header = d3.select('#memory-vis-header');

  const hostSubheading = d3.select('#memory-vis-header-host');
  const targetSubheading = d3.select('#memory-vis-header-target');

  if (opening) {
    header.transition()
    .duration(450)
    .ease(d3.easeLinear)
    .style('opacity', '1');

    hostSubheading.transition()
    .duration(450)
    .ease(d3.easeLinear)
    .style('opacity', '1');

    targetSubheading.transition()
    .duration(450)
    .ease(d3.easeLinear)
    .style('opacity', '1');
  }
  else {
    header.style('opacity', '0');
    hostSubheading.style('opacity', '0');
    targetSubheading.style('opacity', '0');
  }
}

function addDataMovementLegend() {
  let legend_svg = d3.select("#legend");

  const x_start = 70;
  const x_end = 130;
  const y_spacing = 30;
  const y0 = 30;

  {
    legend_svg.append('path')
    .attr('stroke', 'black')
    .attr('fill', 'none')
    .attr('stroke-width', 2)
    .attr('marker-end', 'url(#arrowhead)')
    .attr('d', d3.line()([[x_start, y0], [x_end, y0]]))
    .transition()
    .on('start', function repeat() {
      d3.active(this)
      .transition(d3.easePoly.exponent(3))
      .duration(3000)
      .attrTween('d', function () { return function(t) {
        let dynamic_points = [[x_start, y0], [x_end, y0]]
        const dx = dynamic_points[1][0] - (dynamic_points[0][0] + 10);
        dynamic_points[1][0] = (dynamic_points[0][0] + 10) + (dx * t);
        return d3.line()(dynamic_points);
      }})
      .transition()
      .duration(250)
      .attr('d', d3.line()([[x_start, y0], [x_end, y0]]))
      .on('start', repeat);
    });

    legend_svg.append("text")
    .text("Associate Data Movement")
    .attr('x', x_end + 15)
    .attr('y', y0 + 3)
    .attr('fill', 'black')
    .attr('opacity', 1)
    .attr('font-family', 'Arial')
    .attr('font-size', '12px');
  }

  const y1 = y0 + y_spacing;
  {
    legend_svg.append('path')
    .attr('stroke', 'black')
    .attr('fill', 'none')
    .attr('stroke-width', 2)
    .attr('marker-end', 'url(#arrowhead)')
    .attr('marker-start', 'url(#arrowhead)')
    .attr('opacity', 1)
    .attr('d', d3.line()([[x_start, y1], [x_end, y1]]))
    .transition()
    .on('start', function repeat() {
      d3.active(this)
      .transition(d3.easeLinear)
      .duration(1500)
      .attr('opacity', 0)
      .transition()
      .duration(175)
      .attr('opacity', 1)
      .transition()
      .duration(925)
      .on('start', repeat);
    });

    legend_svg.append("text")
    .text("Disassociate Data Movement")
    .attr('x', x_end + 15)
    .attr('y', y1 + 3)
    .attr('fill', 'black')
    .attr('opacity', 1)
    .attr('font-family', 'Arial')
    .attr('font-size', '12px');
  }

  const y2 = y1 + y_spacing;
  {
    legend_svg.append('path')
    .attr('d', d3.line()([[x_start, y2], [x_end, y2]]))
    .attr('stroke', 'black')
    .attr('stroke-width', 2)
    .attr('marker-end', 'url(#arrowhead)')
    .attr('opacity', 1)
    .attr('stroke-dasharray', e => {
      const dx = x_end - x_start - 8;
      
      const edgeLength = Math.sqrt(dx * dx);
      const repeat = Math.ceil(edgeLength / d3.sum(dashDimensions));
      const array = (dashDimensions.join(' ') + ' ').repeat(repeat);
      return array;
    })
    .transition()
    .on('start', function repeat() {
      d3.active(this)
        .transition()
        .duration(64000)
        .ease(d3.easeLinear)
        .styleTween('stroke-dashoffset', function() {
          return d3.interpolate(960, 0);
        })
        .on('end', repeat);
    });

    legend_svg.append("text")
    .text("To Data Movement")
    .attr('x', x_end + 15)
    .attr('y', y2 + 3)
    .attr('fill', 'black')
    .attr('opacity', 1)
    .attr('font-family', 'Arial')
    .attr('font-size', '12px');
  }

  const y3 = y2 + y_spacing;
  {
    legend_svg.append('path')
    .attr('d', d3.line()([[x_end, y3], [x_start, y3]]))
    .attr('stroke', 'black')
    .attr('stroke-width', 2)
    .attr('marker-end', 'url(#arrowhead)')
    .attr('opacity', 1)
    .attr('stroke-dasharray', e => {
      const dx = x_end - x_start - 8;
      
      const edgeLength = Math.sqrt(dx * dx);
      const repeat = Math.ceil(edgeLength / d3.sum(dashDimensions));
      const array = (dashDimensions.join(' ') + ' ').repeat(repeat);
      return array;
    })
    .transition()
    .on('start', function repeat() {
      d3.active(this)
        .transition()
        .duration(64000)
        .ease(d3.easeLinear)
        .styleTween('stroke-dashoffset', function() {
          return d3.interpolate(960, 0);
        })
        .on('end', repeat);
    });

    legend_svg.append("text")
    .text("From Data Movement")
    .attr('x', x_end + 15)
    .attr('y', y3 + 3)
    .attr('fill', 'black')
    .attr('opacity', 1)
    .attr('font-family', 'Arial')
    .attr('font-size', '12px');
  }
}

let added = false;

function visualizeDataMovement(dataMove, opening) {
  if (!isMovementFrameLargeEnough()) {
    return;
  }

  const svg = initializeSVG(dataMove.datamove.length);
  const trans = svg.transition().duration(450).ease(d3.easeLinear);
  transitionHeader(opening);

  // TODO: check if this is necessary
  // the reason is that without this line, after the target enter visualization,
  // the target end visualization will be the same as the enter visualization
  document.getElementById('data-transfer').innerHTML = '';

  svg
    .select('#data-transfer')
    .selectAll('g')
    .data(dataMove.datamove)
    .join(
      enter => 
      {
        enter
          .append('g')
          .attr('opacity', 0)
          .call(
            enter => 
            {
              const hostRectX = computeAlignmentHost();
              enter.append('rect')
                .attr('x', hostRectX)
                .attr('y', (data, index) => header + (index * (verticalMargin + rectHeight)))
                .attr('width', rectWidth)
                .attr('height', rectHeight)
                .attr('rx', 16)
                .style('fill', 'orange');

              enter.append('text')
                .text(data => data.orig_address)
                .attr('x', hostRectX + horizontalMargin)
                .attr('y', (data, index) => offset + header + (index * (verticalMargin + rectHeight)))
                .attr('fill', 'black')
                .attr('opacity', 1)
                .attr('font-family', 'Arial')
                .attr('font-size', '12px');
              
              const targetRectX = computeAlignmentTarget();
              enter.append('rect')
              .attr('x', targetRectX)
              .attr('y', (data, index) => header + (index * (verticalMargin + rectHeight)))
              .attr('width', rectWidth)
              .attr('height', rectHeight)
              .attr('rx', 16)
              .attr('opacity', 1)
              .style('fill', 'lime');

              enter.append('text')
                .text(data => data.dest_address)
                .attr('x', horizontalMargin + targetRectX)
                .attr('y', (data, index) => offset + header + (index * (verticalMargin + rectHeight)))
                .attr('fill', 'black')
                .attr('opacity', 1)
                .attr('font-family', 'Arial')
                .attr('font-size', '12px');

              enter.append('text')
                .text(data => getDataMovementDescriptionString(data))
                .attr('x', data => computeAlignmentMovementLabel(getDataMovementDescriptionString(data)))
                .attr('y', (data, index) => 10 + header + (index * (verticalMargin + rectHeight)))
                .attr('fill', 'black')
                .attr('opacity', 1)
                .attr('font-family', 'Arial')
                .attr('font-size', '12px');

              enter.filter(d => {
                return isToDataMovement(d.flag) || isFromDataMovement(d.flag);
              })
              .append('path')
              .attr('d', data => 
              {
                const points = computeConnectingLineCoords(data, data.index, 'to/from');
                return d3.line()(points);
              })
              .attr('stroke', 'black')
              .attr('stroke-width', 2)
              .attr('marker-end', 'url(#arrowhead)')
              .attr('stroke-dasharray', e => {
                const dx = horizontalDivision - 8;
                const dy = 0;
                
                const edgeLength = Math.sqrt(dx * dx + dy * dy);
                const repeat = Math.ceil(edgeLength / d3.sum(dashDimensions));
                const array = (dashDimensions.join(' ') + ' ').repeat(repeat);
                return array;
              })
              .transition()
              .on('start', function repeat() {
                d3.active(this)
                  .transition()
                  .duration(16000)
                  .ease(d3.easeLinear)
                  .styleTween('stroke-dashoffset', function() {
                    return d3.interpolate(960, 0);
                  })
                  .on('end', repeat);
              });

              /**
               * Growing solid arrow animation used to denote associate data movement.
               */
              enter.filter(d => {
                return isAssociateDataMovement(d.flag);
              })
              .append('path')
              .attr('stroke', 'black')
              .attr('fill', 'none')
              .attr('stroke-width', 2)
              .attr('marker-end', 'url(#arrowhead)')
              .attr('d', data => {
                let points = computeConnectingLineCoords(data, data.index, 'assoc');
                points[1][0] = points[0][0] + 10;
                points[1][1] = points[0][1];
                return d3.line()(points);
              })
              .transition()
              .on('start', function repeat() {
                d3.active(this)
                .transition(d3.easePoly.exponent(3))
                .duration(4000)
                .attrTween('d', function(data) {
                  return function(t) {
                    let points = computeConnectingLineCoords(data, data.index, 'assoc');
                    const dx = points[1][0] - (points[0][0] + 10);
                    points[1][0] = (points[0][0] + 10) + (dx * t);
                    return d3.line()(points);
                  }
                })
                .transition()
                .duration(500)
                .attr('d', data => {
                  let points = computeConnectingLineCoords(data, data.index, 'assoc');
                  points[1][0] = points[0][0] + 10;
                  points[1][1] = points[0][1];
                  return d3.line()(points);
                })
                .on('start', repeat);
              });

              /**
               * Fading double arrow line used to denote disassociate data movement.
               * 
               * https://stackoverflow.com/questions/54852791/angular-d3-understanding-attrtween-function
               */
              enter.filter(d => {
                return isDisassociateDataMovement(d.flag);
              })
              .append('path')
              .attr('d', data => {
                const points = computeConnectingLineCoords(data, data.index, 'assoc');
                return d3.line()(points);
              })
              .attr('stroke', 'black')
              .attr('fill', 'none')
              .attr('stroke-width', 2)
              .attr('marker-end', 'url(#arrowhead)')
              .attr('marker-start', 'url(#arrowhead)')
              .attr('opacity', 1)
              .transition()
              .on('start', function repeat() {
                d3.active(this)
                .transition(d3.easeLinear)
                .duration(4000)
                .attr('opacity', 0)
                .transition()
                .duration(500)
                .attr('opacity', 1)
                .transition()
                .duration(2500)
                .on('start', repeat);
              });
              
              enter.transition(trans)
              .attr('opacity', 1);
            });
      }
      );

  if (opening) {
    if (!added) {
      addDataMovementLegend();
      added = true;
    } else {
      let legend_svg = d3.select("#legend");
      legend_svg.style.opacity = 0;
    }
  } else {
    legend_svg.style.opacity = 1;
  }
}

function populateIndices(datamove) {
  for (let i = 0; i < datamove.length; ++i) {
    datamove[i].index = i;
  }
}


let prevHighlightLineLeft = -1;
let prevHighlightLineRight = -1;

function resetErrorLineLeft(editor) {
  if (prevHighlightLineLeft != -1) {
    editor.markText({ line: prevHighlightLineLeft, ch: 0 }, { line: prevHighlightLineLeft + 1, ch: 0 }, { css: 'background-color: transparent;' });
    prevHighlightLineLeft = -1;
  }
}

function resetErrorLineRight(editor) {
  if (prevHighlightLineRight != -1) {
    editor.markText({ line: prevHighlightLineRight, ch: 0 }, { line: prevHighlightLineRight + 1, ch: 0 }, { css: 'background-color: transparent;' });
    prevHighlightLineRight = -1;
  }
}

function enteredNode(g, nodeId, editorLeft, editorRight)
{
  const node = g.node(nodeId);
  
  if (node.data.source_line && !node.data.has_race) {
    const highlight_line = node.data.source_line - 1;
    let color = get_node_color(node);

    editorLeft.markText({line: highlight_line, ch: 0}, {line: highlight_line + 1, ch: 0}, { css: `background-color: ${color};` });
    let t = editorLeft.charCoords({line: highlight_line, ch: 0}, 'local').top;
    let middleHeight = editorLeft.getScrollerElement().offsetHeight / 2;
    editorLeft.scrollTo(null, t - middleHeight - 5);
  }
}

function exitedNode(g, nodeId, editor, editor2)
{
  const node = g.node(nodeId);

  if (node.data.source_line) {
    const highlight_line = node.data.source_line - 1;
    editor.markText({ line: highlight_line, ch: 0 }, { line: highlight_line + 1, ch: 0 }, { css: 'background-color: transparent;' });
  }
}


function visualizeDAG_dagre(g, svgID, dataMovementInfo, codeEditor, codeEditor2) {
  dagre.layout(g);
  const width = g.graph().width;
  const height = g.graph().height;

  const svg = d3.select(svgID);

  svg.attr('width', width + 10)
  svg.attr('height', height + 10);
  
  const trans = svg.transition().duration(300);

  let tooltip = d3.select('#tooltip');

  // Create SVG elements for nodes
  svg
    .select('#nodes')
    .selectAll('g')
    .data(Array.from(dag.nodes()), n => n)
    .join(
      enter => {
        enter
          .append('g')
          .attr('transform', n => `translate(${g.node(n).x}, ${g.node(n).y})`)
          .attr('opacity', 0)
          .call(
            enter => {
              enter.append('circle')
                .attr('id', n => 'circle' + n)
                .on('click', n => click_dagre(g.node(n), g, svgID))
                .attr('r', nodeRadius)
                .attr('cursor', 'pointer')
                .attr('fill', n => get_node_color(g.node(n)))
                .on('mouseover', n => {
                  tooltip.style('visibility', 'visible');
                  enteredNode(g, n, codeEditor, codeEditor2);
                  if (!dataMovementInfo) {
                    return;
                  }

                  const nodeIdNum = get_node_id(g.node(n));
                  let index = dataMovementInfo.findIndex(tr => tr.begin_node === nodeIdNum);
                  if (index !== -1) 
                  {
                    document.getElementById('source-code-wrapper2').style.display = 'none';
                    document.getElementById('sidebar-display').style.display = 'inline';

                    /* Hovered over a node with beginning data transfer */
                    const clone = JSON.parse(JSON.stringify(dataMovementInfo[index]));
                    clone.datamove = dataMovementInfo[index].datamove.filter(x => shouldShowOnBeginNode(x.flag));
                    populateIndices(clone.datamove);
                    visualizeDataMovement(clone, true);
                    return;
                  }
                  
                  index = dataMovementInfo.findIndex(tr => tr.end_node === nodeIdNum);
                  if (index !== -1)
                  {
                    document.getElementById('source-code-wrapper2').style.display = 'none';
                    document.getElementById('sidebar-display').style.display = 'inline';

                    const clone = JSON.parse(JSON.stringify(dataMovementInfo[index]));
                    clone.datamove = dataMovementInfo[index].datamove.filter(x => shouldShowOnEndNode(x.flag));
                    populateIndices(clone.datamove);
                    visualizeDataMovement(clone, true);
                    return;
                  }
                })
                .on('mousemove', n => {
                  let text = 
                  `<strong>This Node Ends with: <span class='colored-text'>${get_event_string(g.node(n).data.end_event)}</span> </strong> <br>
                   <strong>This Node Has a race: <span class='colored-text'>${(g.node(n).data.has_race) ? 'YES' : 'NO'}</span> </strong> <br>
                   <strong>stack: <span class="colored-text">${g.node(n).data.stack}</span> </strong> <br>`
                  
                  tooltip.html(text)
                })
                .on('mouseout', n => {
                  tooltip.style('visibility', 'hidden');
                  exitedNode(g, n, codeEditor, codeEditor2);
                  if (!dataMovementInfo) {
                    return;
                  }
                  const nodeIdNum = get_node_id(g.node(n));
                  const index = dataMovementInfo.findIndex(tr => tr.begin_node === nodeIdNum || tr.end_node === nodeIdNum);
                  if (index !== -1) 
                  {
                    document.getElementById('source-code-wrapper2').style.display = 'inline';
                    document.getElementById('sidebar-display').style.display = 'none';
                    /* Hovered over a node with beginning or ending data transfer */
                    visualizeDataMovement({ begin_node: '', end_node: '', datamove: []}, false);
                  }
                })

              enter.append('text')
                .text(n => {
                  let node = g.node(n);
                  if(node.data.has_race == 1){
                    return 
                  }
                  return node.data.source_line;
                })
                // .attr('font-weight', 'bold')
                .attr('font-family', 'sans-serif')
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('fill', 'black')
                .attr('class', 'unselectable-text')
                .attr('font-size', 'xx-small')
                .style('pointer-events', 'none');

              enter.transition(trans).attr('opacity', n => get_node_opacity(g.node(n)));

              enter.filter(n => g.node(n).data.has_race == 1)
              .append('circle')
              .attr('r', nodeRadius + 2)
              .attr('fill', 'none')
              .attr('stroke', 'blue') // Border color
              .attr('stroke-width', 3) // Border width
              .attr('stroke-dasharray', '4,4') // Dash pattern
                .append('animateTransform')
                .attr('attributeName','transform')
                .attr('type','rotate')
                .attr('from', n => `360 ${g.node(n).x/10000} ${g.node(n).y/10000}`)
                .attr('to', n => `0 ${g.node(n).x/10000} ${g.node(n).y/10000} `)
                .attr('dur','10s')
                .attr('repeatCount','indefinite');
              }
          )
        },
      update => {
        update.transition(trans)
        .select('circle')
        .attr('fill', n => get_node_color(g.node(n)))

        update.transition(trans)
        .attr('opacity', n => get_node_opacity(g.node(n)))

        update.filter(n => g.node(n).data.hidden)
        .style('pointer-events', 'none');

        update.filter(n => g.node(n).data.hidden === false)
        .style('pointer-events', 'auto');
      },
      exit => {
        exit.remove();
      }
    );

  
  // link paths
  svg
    .select('#links')
    .selectAll('path')
    .data(g.edges(), e => e.v + '-->' + e.w)
    .join(
      enter => { 
        enter
        .append('path')
        .attr('d', e => {
          pts = g.edge(e).points;
          return d3.line()
                  .x((p) => p.x)
                  .y((p) => p.y)
                  .curve(d3.curveMonotoneY)(pts);
        })
        .attr('class', e => get_edge_type_string(g.edge(e)))
        .attr('fill', 'none')
        .attr('stroke-width', 2)
        .attr('stroke', e => get_edge_color(g.edge(e)))
        .attr('marker-end', e => {
          if (g.edge(e).data != undefined && g.edge(e).data.edge_type === "BARRIER"){
            return ''
          }
          return 'url(#arrowhead)'
        })
        .attr('opacity', e => get_edge_opacity(g.edge(e)))
        .attr('stroke-dasharray', e => get_edge_dash(g.edge(e)))
      },
      update => {
        update.transition(trans)
              .attr('opacity', e => get_edge_opacity(g.edge(e)))
      },
      exit => {
        exit.remove()
      }
    );

  d3.selectAll('.TARGET')
  .attr('opacity', e => get_edge_opacity(g.edge(e)))
  .attr('stroke-dasharray', '4')
  .attr('marker-end', 'url(#arrowhead)')
  .transition()
  .on('start', function repeat() {
    d3.active(this)
      .transition()
      .duration(16000)
      .ease(d3.easeLinear)
      .styleTween('stroke-dashoffset', function() {
        return d3.interpolate(960, 0);
      })
      .on('end', repeat);
  });

}