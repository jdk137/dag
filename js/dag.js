

/* dag */
var Dag = function (config) {
  this.config = config;
  //var container = config.containerId || "chart";
  var container = $(typeof config.container === "string" ? document.getElementById(config.container) : config.container); // id or dom node
  var containerDom = container[0];
  var cover;
  //config
  var width = container.width() || 1000, //宽
      height = container.height() || 500; //高

  var zoomCenterStyle = config.zoomCenterStyle || 'imageCenter'; //'mousePoint'; // 'imageCenter';
  
  var paddingLineSpace = config.paddingLineSpace || 10; //同级间线的上下距离
  var levelSpace = config.levelSpace || 40,             //节点宽度
      levelPadding = levelSpace,
      levelTotalSpace = levelSpace + levelPadding;
  var boxSpace = config.boxSpace || 160;                //节点高度
  var margin = {
      left: boxSpace,
      right: boxSpace,
      top: levelPadding,
      bottom: levelPadding
  };
  var linkCombine = config.linkCombine || false;        //同个节点导出的线是否合并
  var defaultNodeWidth = boxSpace;
  var defaultNodeHeight = levelSpace;

  var multiSelect = config.multiSelect || false;        //选择模式下框选功能是否开启

  var selectDragReplacedByMove = config.selectDragReplacedByMove || true; //选择模式下框选是否被移动画布功能替代
  var clickNodeToHighlightLink = config.clickNodeToHighlightLink || true; //点击节点时是否高亮该节点的所有连线

  //canvas size
  var dagH,
      dagW;
  var vb = [0, 0, 1, 1]; // view box
  
  //global
  var floatTag, //浮框jquery对象
      svg, //svg d3对象
      bgsvg, //背景svg d3对象
      selectBox, //框选svg rect d3对象
      sankey, //sankey布局对象
      highlightLink; //高亮link布局对象
  var highlightedNodeLinks = []; //高亮的节点线
  var highlightNodeId = ''; //线高亮的节点的id
  var borderRect;
  
  //interactive related
  var dragMouseStart = {x: 0, y: 0};
  var dragCanvasStart = {x: 0, y: 0};
  var mouseDragged = false; // if mouse click( not drag), false; if dragged, true
  var handDragging = false;
  var selectDragging = false;
  var mouseOnCanvas = false;
  var nodesInView = [];
  var nodeHovering;
  var nodeClicked;
  // selected Node
  var nodesSelected = {};

  //flowData
  var flowData = config.data;

  //event handles
  var selectNodeHandle = config.selectNodeHandle || function () {};
  var doubleClickNodeHandle = config.doubleClickNodeHandle || function () {};
  /*
  function (nodesSelected) {
    console.log(nodesSelected);
  };
  */
  var nodeHoverInHandle = config.nodeHoverInHandle || function () {};
  /*
  function (node) {
    console.log("hoverIn " + node.id);
  };
  */
  var nodeHoverOutHandle = config.nodeHoverOutHandle || function () {};
  /*
  function (node) {
    console.log("hoverOut " + node.id);
  };
  */
  var middleClickHandle = config.middleClickHandle || function () {};
  /*
  function (node) {
    console.log("middleClick " + node.id);
  };
  */
  var nodeClickInHandle = config.nodeClickInHandle || function () {};
  /*
  function (node) {
    console.log("nodeClickIn " + node.id);
  };
  */
  var nodeClickOutHandle = config.nodeClickOutHandle || function () {};
  /*
  function (node) {
    console.log("nodeClickOut " + node.id);
  };
  */
  var rightClickHandle = config.rightClickHandle || function () {};
  var doubleRightClickHandle = config.doubleRightClickHandle || function () {};
  /*
  function (e, node) {
    console.log(node.id);
    var newId = node.id + "_" + Math.round(Math.random() * 100);
    var newData = {
      nodes: [{id: newId, name: newId}],
      links: [{source: newId, target: node.id}]
    };
    addData(newData);
  };
  */
  var drawNode = config.drawNode || function (d) {
    var c = $('<div xmlns="http://www.w3.org/1999/xhtml">' + d.id + '</div>')
      .attr("class", "foreignNode")
      .css({
          'width': d.pos.w,
          'height': d.pos.h,
          'background-color': "green"
        });
    $(this).append(c);
  };
  
  //init dom node
  var init = function () {
      //init chart;
      container.css({
          "position": "relative"
          /*
          "width": width,
          "height": height
          */
      });
      /*
      container.bind('resize', function(e) {
          console.log('resize');
         // all your magic resize mojo goes here
      });
      */
      
      cover = $("<div/>").css({
          "position": "absolute",
          "left": 0,
          "top": 0,
          "z-index": 50,
          "background-color": "rgba(0, 0, 0, 0.001)",
          "cursor": 'move',//"url(img/openhand.cur) 4 4, move",
          "width": width,
          "height": height
      }).appendTo(container);
      cover.hide();
      
      //svg = d3.select("#" + containerId).append("svg")
      svg = d3.select(containerDom).append("svg")
          .attr("xmlns", "http://www.w3.org/2000/svg")
          .attr("class", "canvas")
          .attr("width", width)
          .attr("height", height);
      borderRect = svg.append("rect")
          .attr("stroke-width", 1)
          .attr("stroke", "black")
          .attr("opacity", "0")
          .attr("fill", "white");
      bgsvg = svg.append("g");
          //.attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
      highlightLink = svg.append("path")
          .attr("class", "highlight link");
      selectBox = svg.append("rect")
          .attr("class", "selectBox");
  
      //init gradient
      var nodeGradient = bgsvg.append("defs").append("linearGradient")
          .attr("id", "nodeGradient")
          .attr("x1", "100%")
          .attr("y1", "100%")
          .attr("x2", "100%")
          .attr("y2", "0%");
      nodeGradient.append("stop")
          .attr("stop-color", "rgb(81,219,122)")
          .attr("offset", "0%");
      nodeGradient.append("stop")
          .attr("stop-color", "rgb(202,237,204)")
          .attr("offset", "65%");
      
      //init layout
      sankey = d3.sankey();
  };
  init();
  
  //layout data
  var processData = function (fData) {
      flowData = fData;
          
      //layout
      sankey
          .nodes(flowData.nodes)
          .links(flowData.links)
          .margin(margin)
          .defaultNodeWidth(defaultNodeWidth)
          .defaultNodeHeight(defaultNodeHeight)
          .paddingLineSpace(paddingLineSpace)
          .linkCombine(linkCombine)
          .layout(40);
  
      flowData.nodes = sankey.nodes();
      flowData.links = sankey.links();
  
      var totalLevel = sankey.nodesByLevel().length;
  
      //vertical
      /*
      dagH = totalLevel * (levelSpace + levelPadding) - levelPadding + margin.top + margin.bottom;
      dagW = boxSpace / sankey.nodeSpace() + margin.left + margin.right;
      */
      dagW = sankey.width() || width;
      dagH = sankey.height() || height;  
  };

  //link path creator
  var createLinkPath = function (d) {
    // vertical
    var x0 = d.pos.x0,
        x1 = d.pos.x1,
        y0 = d.pos.y0,
        y1 = d.pos.y1;
    //var ratio = (1 + d.source.levelIndex)  / (d.source.levelEls.length + 1);
    d.linkPathWithoutArrow = "M" + x0 + "," + y0
         //+ "L" + x0 + "," + (y0 + levelPadding * ratio)
         //+ "L" + x1 + "," + (y0 + levelPadding * ratio) 
         + "L" + x0 + "," + d.pos.turnY
         + "L" + x1 + "," + d.pos.turnY
         + "L" + x1 + "," + y1;
    d.linkPath = d.linkPathWithoutArrow
         + "L" + (x1 - 3) + "," + (y1 - 5)
         + "L" + x1 + "," + (y1 - 3)
         + "L" + (x1 + 3) + "," + (y1 - 5)
         + "L" + x1 + "," + y1;
    d._elem = this;
    return d.linkPath;
  };
  //draw background svg
  var createSVG = function (flowData) {
    //init canvas size
    var initRatio = Math.min(width / dagW, height / dagH);
    var w = width / initRatio;
    var h = height / initRatio;
    vb = [dagW / 2 - w / 2, dagH / 2 - h / 2, w, h];
    //svg.attr("viewBox", vb.join(" "));
    resetViewBox();
    borderRect.attr("width", dagW)
      .attr("height", dagH);

    bgsvg.selectAll('g').remove();
    //link
    var link = bgsvg.append("g").selectAll(".link")
        .data(flowData.links)
      .enter().append("path")
        .attr("class", "link")
        .attr("d", createLinkPath);
    link.append("title");
  
    //node container
    var node = bgsvg.append("g").selectAll(".node")
        .data(flowData.nodes)
      .enter().append("g")
        .attr("class", "node")
        .attr("param", function (d) { return d.id; })
        .attr("transform", function(d) { return "translate(" + d.pos.x + "," + d.pos.y + ")"; });
  
    var foreignObject = node.append("foreignObject")
        .attr("height", function(d) { return d.pos.h; })
        .attr("width", function (d) { drawNode.call(this, d); return d.pos.w; });
 
    node.append("rect")
        .attr("height", function(d) { return d.pos.h; })
        .attr("width", function (d) { return d.pos.w; })
        .attr("fill", "none");

    highlightLink.attr("d", "M0,0L0,0");
  };
  

  /*
   * useful functions
   */
  var getZoomRatio = function () {
    return Math.min(width / vb[2], height / vb[3]);
  };
  var getMouseLoc =  function (e) {
      var offset = $(container).offset();
      if (!(e.pageX && e.pageY)) {return false;}
      var x = e.pageX - offset.left,
          y = e.pageY - offset.top;
      return {x: x, y: y};
  };
  var getNodesInBox = function (box, nodes) {
    //box [x, y, w, h]; if w = h = 0.5, then can judge which nodes containes the point;
    //nodes array of nodes in flowData.nodes structure;
    //return nodes intersect with the box
    var inBoxNodes = [];
    var x1 = box[0],
        y1 = box[1],
        x2 = box[0] + box[2],
        y2 = box[1] + box[3];
    nodes.forEach(function (d) {
      var pos = d.pos;
      if (pos.x2 > x1 && pos.x < x2 && pos.y < y2 && pos.y2 > y1) {
        inBoxNodes.push(d);
      }
    });
    return inBoxNodes;
  };
  var getNodeUnderMouse = function (e) {
    var mouseLoc = getMouseLoc(e);
    var canvasLoc = pixelToScale(mouseLoc);
    var nodes = getNodesInBox([canvasLoc.x, canvasLoc.y, 0.5, 0.5], flowData.nodes);
    if (nodes.length > 0) {
      return nodes[0];
    } else {
      return undefined;
    }
  };
  var cleanNodesSelected = function () {
    var key;
    var node;
    for (key in nodesSelected) {
      node = nodesSelected[key];
      node.attr("class", "node"); 
      delete node;
    }
    nodesSelected = {};
  };
  var getNodesSelectedNumber = function () {
    var key;
    var count = 0;
    for (key in nodesSelected) {
      count += 1;
    }
    return count;
  };
  //放大
  var zoomIn = this.zoomIn = function (config) {
    var zoomRatio = config && config.zoomRatio || 1.2;
    var zoomPointX = config && config.zoomPointX || (vb[2] / 2);
    var zoomPointY = config && config.zoomPointY || (vb[3] / 2);
    if (zoomCenterStyle === 'imageCenter') {
      zoomPointX = vb[2] / 2;
      zoomPointY = vb[3] / 2;
    }
    var xRatio = zoomPointX / vb[2];
    var yRatio = zoomPointY / vb[3];
    var nvb;
    if (vb[2] / zoomRatio <= width && vb[3] / zoomRatio <= height) {
      var nw;
      if (width / dagW < height / dagH) {
        nw = width;
      } else {
        nw = width / ((width / dagW) / (height / dagH));
      }
      var nh = nw / width * height;
      nvb = [vb[0] + zoomPointX - nw * xRatio, vb[1] + zoomPointY - nh * yRatio, nw, nh];
    } else {
      nvb = [vb[0] + zoomPointX - vb[2] / zoomRatio * xRatio, vb[1] + zoomPointY - vb[3] / zoomRatio * yRatio, vb[2] / zoomRatio, vb[3] / zoomRatio];
    }
    vb = nvb;
    //svg.attr("viewBox", vb.join(" "));
    resetViewBox();
  };
  //缩小
  var zoomOut = this.zoomOut = function (config) {
    var zoomRatio = config && config.zoomRatio || 1.2;
    var zoomPointX = config && config.zoomPointX || (vb[2] / 2);
    var zoomPointY = config && config.zoomPointY || (vb[3] / 2);
    if (zoomCenterStyle === 'imageCenter') {
      zoomPointX = vb[2] / 2;
      zoomPointY = vb[3] / 2;
    }
    var xRatio = zoomPointX / vb[2];
    var yRatio = zoomPointY / vb[3];
    if (vb[2] > dagW && vb[3] > dagH) {
      return;
    }
    var nvb = [vb[0] + zoomPointX - vb[2] * zoomRatio * xRatio, vb[1] + zoomPointY - vb[3] * zoomRatio * yRatio, vb[2] * zoomRatio, vb[3] * zoomRatio];
    vb = nvb;
    //svg.attr("viewBox", vb.join(" "));
    resetViewBox();
  };
  // pixel loc to scale loc
  var pixelToScale = this.pixelToScale = function (pl) {
    var ratio = getZoomRatio();
    return {
      x: vb[0] + pl.x / ratio,
      y: vb[1] + pl.y / ratio
    };
  };
  // scale loc to pixel loc
  var scaleToPixel = this.scaleToPixel = function (sl) {
    var ratio = getZoomRatio();
    return {
      x: (sl.x - vb[0]) * ratio,
      y: (sl.y - vb[1]) * ratio
    };
  };
  // pixel offset of container to scale offset of container
  var offsetPixelToScale = this.offsetPixelToScale = function (pl) {
    var ratio = getZoomRatio();
    return {
      x: pl.x / ratio,
      y: pl.y / ratio
    };
  };
  var resetViewBox = function () {
    svg.attr("viewBox", vb.join(" "));
  };
  //视窗变动动画。b为viewbox: [x, y, width, height], cb为回调函数。
  var animateViewBox = this.animateViewBox = function (b, cb) {
    var callback = cb || function () {};
    svg.transition()
      .duration(300)
      .attr("viewBox", b.join(" "))
      .each('end', callback);
  };
  //最大化视窗
  var maximizeViewBox = this.maximizeViewBox = function (cb) {
    animateViewBox([0, 0, dagW, dagH], cb);
  };
  //聚焦视窗于某个节点
  var focusViewBoxOnNode = this.focusViewBoxOnNode = function (node, cb) {
    var pos = node.pos;
    vb = [pos.x + pos.w / 2 - width / 2, pos.y + pos.h / 2 - height / 2, width, height];
    animateViewBox(vb, cb);
  };

  /* 
   * interactives
   */
  // mouse wheel event  zoomin and zoomout
  (function () {
    //http://www.sitepoint.com/html5-javascript-mouse-wheel/
    function MouseWheelHandler(e) {
      if (handDragging) {
        return;
      }
    	// cross-browser wheel delta
    	var e = window.event || e; // old IE support
      //get offset loc of zoomPoint on canvas
      var scaleOffset = offsetPixelToScale(getMouseLoc(e));
      var zoomPoint = {
        zoomPointX: scaleOffset.x, //canvas
        zoomPointY: scaleOffset.y
      };
    	var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
      if (delta < 0) {
        zoomOut(zoomPoint);
      } else if (delta > 0) {
        zoomIn(zoomPoint);
      }
      //http://stackoverflow.com/questions/5802467/prevent-scrolling-of-parent-element/9786301#9786301
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.returnValue = false;
      return false;
    }
  
    var container = containerDom; //document.getElementById(containerId);
    if (container.addEventListener) {
    	// IE9, Chrome, Safari, Opera
    	container.addEventListener("mousewheel", MouseWheelHandler, false);
    	// Firefox
    	container.addEventListener("DOMMouseScroll", MouseWheelHandler, false);
    }
    // IE 6/7/8
    else container.attachEvent("onmousewheel", MouseWheelHandler); 
  }());

  // 2 kinds of dragging
  var handDrag = function (e) {
    var mouseLoc = getMouseLoc(e);
    var zoomRatio = getZoomRatio();
    var m = {x: (mouseLoc.x - dragMouseStart.x) / zoomRatio, y: (mouseLoc.y - dragMouseStart.y) / zoomRatio}; 
    //console.log("move: ", m);
    var nvb = [dragCanvasStart.x - m.x, dragCanvasStart.y - m.y, vb[2], vb[3]];
    vb = nvb;
    //svg.attr("viewBox", vb.join(" "));
    resetViewBox();
  };
  var selectDrag = function (e) {
    var getNodesInView = function () {
      nodesInView = getNodesInBox(vb, flowData.nodes);
    };
    var getNodesInSelect = function () {
      cleanNodesSelected();
      var addNode = function (id) {
        var node = $('g[param="' + id + '"]');
        node._nodeId = id;
        node.attr("class", "node selected");
        nodesSelected[id] = node;
      }
      var intersectNodes = getNodesInBox([p1.x, p1.y, w, h], nodesInView);
      intersectNodes.forEach(function (d) {
        addNode(d.id);
      });
    };
    var mouseLoc = getMouseLoc(e);
    var canvasLoc = pixelToScale(mouseLoc);
    var p1 = {
      x: Math.min(canvasLoc.x, dragCanvasStart.x),
      y: Math.min(canvasLoc.y, dragCanvasStart.y)
    };
    var p2 = {
      x: Math.max(canvasLoc.x, dragCanvasStart.x),
      y: Math.max(canvasLoc.y, dragCanvasStart.y)
    };
    var w = p2.x - p1.x;
    var h = p2.y - p1.y;
    if (typeof nodesInView === 'undefined') {
      if (w > 10 && h > 10) {
        cleanNodesSelected();
        getNodesInView();
      }
    } else {
      selectBox.attr("x", p1.x)
        .attr("y", p1.y)
        .attr("width", w)
        .attr("height", h);
      getNodesInSelect();
    }
  };
  var _mousemove = function (e) {
    if (handDragging) {
      handDrag(e);
    }
    if (selectDragging) {
      if (selectDragReplacedByMove) {
        handDrag(e);
      } else {
        if (multiSelect) {
          selectDrag(e);
        }
      }
    }
    nodeHoverHandle(e);
  };
  $(container).mousemove(_mousemove);
  //bind hand drag event
  cover.mousedown(function (e) {
    dragMouseStart = getMouseLoc(e);
    //console.log(dragMouseStart);
    dragCanvasStart = {x: vb[0], y: vb[1]};
    //console.log(dragCanvasStart);
    handDragging = true;
    return false;
  });
  cover.mouseup(function (e) {
    handDragging = false;
  });
  //bind select drag event
  container.find("svg.canvas").mousedown(function (e) {
    dragMouseStart = getMouseLoc(e);
    if (selectDragReplacedByMove) {
      dragCanvasStart = {x: vb[0], y: vb[1]};
    } else {
      dragCanvasStart = pixelToScale(dragMouseStart);
    }
    nodesInView = undefined;
    
    //console.log(dragMouseStart);
    //console.log(dragCanvasStart);
    selectDragging = true;
    //selectDragging = multiSelect;
    return false; // prevent firefox drag image and chrome select words
  });
  container.find("svg.canvas").mouseup(function (e) {
    var dragMouseEnd = getMouseLoc(e);
    if (dragMouseEnd.x === dragMouseStart.x && dragMouseEnd.y === dragMouseStart.y) {
      mouseDragged = false;
    } else {
      mouseDragged = true;
    }
    selectBox.attr("width", 0).attr("height", 0);
    selectDragging = false;
    selectNodeHandle(nodesSelected);
  });

  //click to select nodes
  container.on("click", ".foreignNode", function (e) {
    if (mouseDragged) {
      return;
    }
    var node = $(this).parent().parent();
    var id = node.attr("param");
  
    var addNode = function () {
      node._nodeId = id;
      node.attr("class", "node selected");
      nodesSelected[id] = node;
    }
    var deleteNode = function () {
      node.attr("class", "node");
      delete nodesSelected[id];
    }
  
    var ctrlKey = (function () {
      //http://stackoverflow.com/questions/7044944/jquery-javascript-to-detect-os-without-a-plugin
      //http://stackoverflow.com/questions/3902635/how-does-one-capture-a-macs-command-key-via-javascript
      var isMacOS = navigator.appVersion.indexOf("Mac")!=-1;
      if (isMacOS) {
        var browser = $.browser;
        var keyCode = e.keyCode || e.which;
        if (browser.webkit) {
          return keyCode === 91 || keyCode === 93;
        } else if (browser.mozilla) {
          return keyCode === 224;
        } else if (browser.opera) {
          return keyCode === 17;
        } else {
          return false;
        }
      } else {
        return e.ctrlKey;
      }
    }());

    if (!ctrlKey) {
      if (typeof nodesSelected[id] === 'undefined') {
        cleanNodesSelected();
        addNode();
      } else {
        if (getNodesSelectedNumber() > 1) {
          cleanNodesSelected();
          addNode();
        } else {
          deleteNode();
        }
      }
    } else {
      if (typeof nodesSelected[id] === 'undefined') {
        addNode();
      } else {
        deleteNode();
      }
    }
    selectNodeHandle(nodesSelected);
    nodeClickHandle(e);
     
    if (clickNodeToHighlightLink) {
      highlightNodeLinks(node[0].__data__);
    }
  });
  
  //right click
  container.on("contextmenu", (function (e) {
    var timeout = 0, clicked = false;
    return function(e) {
      var node = getNodeUnderMouse(e);
      if (typeof node === 'undefined') {
        return;
      } else {
        //http://stackoverflow.com/questions/12098327/how-to-add-dbclick-on-right-click-in-jquery
        e.preventDefault();
  
        if( clicked ) {
            clearTimeout(timeout);
            clicked = false;
            doubleRightClickHandle(e, node);
        }
        else {
            clicked = true;
            timeout = setTimeout( function() {
                clicked = false;
                rightClickHandle(e, node);
            }, 300 );
        }
        
        return false;
      }
    };
  }()));
  
  //middleClickHandle 中键点击事件
  container.on('click', function(e) {
    var node;
    if (1 === e.button) {
      e.preventDefault();
      node = getNodeUnderMouse(e);
      if (typeof node !== 'undefined') {
        middleClickHandle(node);
      }
    }
  });

  var nodeClickHandle = function (e) {
    var node = getNodeUnderMouse(e);
    if (typeof node !== 'undefined') {
      if (typeof nodeClicked === 'undefined') {
        nodeClicked = node;
        nodeClickInHandle(nodeClicked);
      } else {
        nodeClickOutHandle(nodeClicked);
        nodeClicked = node;
        nodeClickInHandle(nodeClicked);
      }
    } else {
      if (typeof nodeClicked !== 'undefined') {
        nodeClickOutHandle(nodeClicked);
        nodeClicked = undefined;
      } 
    }
  }
  
  //node hover
  var nodeHoverHandle = function (e) {
    var node = getNodeUnderMouse(e);
    if (typeof node !== 'undefined') {
      if (typeof nodeHovering === 'undefined') {
        nodeHovering = node;
        nodeHoverInHandle(nodeHovering);
      } else {
        if (nodeHovering.id !== node.id) {
          nodeHoverOutHandle(nodeHovering);
          nodeHovering = node;
          nodeHoverInHandle(nodeHovering);
        }
      }
    } else {
      if (typeof nodeHovering !== 'undefined') {
        nodeHoverOutHandle(nodeHovering);
        nodeHovering = undefined;
      } 
    }
  }; 
  
  // link click
  container[0].addEventListener('click', function(e) {
    // do nothing if the target does not have the class drawnLine
    var d = e.target.__data__;
    if (typeof e.target.className === 'undefined' || typeof e.target.className.baseVal === 'undefined') {
      return ;
    }
    if (e.target.className.baseVal.indexOf("link") === -1) return;
    if (e.target.className.baseVal.indexOf("highlight") === -1) {
      highlightLink.attr("d", d.linkPathWithoutArrow);
    } else {
      highlightLink.attr("d", "M0,0L0,0");
    }
  });
  
  //arrow key
  container.on("mouseenter", function () {
      //console.log("mouseenter");
      mouseOnCanvas = true;
  });
  container.on("mouseleave", function () {
      //console.log("mouseleave");
      mouseOnCanvas = false;
  });
  $(document).keydown(function(e){
      if (!mouseOnCanvas) {
        return;
      }
      var keyCode = e.keyCode || e.which,
          arrow = {left: 37, up: 38, right: 39, down: 40 };
      
      if (keyCode === arrow.left) {
        //console.log( "left pressed" );
        vb[0] = vb[0] - vb[2] / 10;
      } else if (keyCode === arrow.right) {
        //console.log( "right pressed" );
        vb[0] = vb[0] + vb[2] / 10;
      } else if (keyCode === arrow.up) {
        //console.log( "up pressed" );
        vb[1] = vb[1] - vb[3] / 10;
      } else if (keyCode === arrow.down) {
        //console.log( "down pressed" );
        vb[1] = vb[1] + vb[3] / 10;
      } else {
        return;
      }
      resetViewBox();
      return false;
  });



  //返回节点和链接的结构数据
  this.dump = function () {
    return flowData;
  };
  
  /* 渲染 */
  var render = this.render = function () {
    processData(flowData);
    //draw
    createSVG(flowData);
    zoomIn();
    zoomOut();
  };

  /* 设置缩放中心点，可以mousePoint或者imageCenter */
  var setZoomCenter = this.setZoomCenter = function (style) {
    if (style === 'mousePoint') {
      zoomCenterStyle = 'mousePoint';
    } else {
      zoomCenterStyle = 'imageCenter';
    }
  };

  /* 清空某节点的子节点的数据(不包括本身)，并重新渲染。 参数为node节点对象 */
  var cleanNodeChildren = this.cleanNodeChildren = function (node) {
    node.removable = true;
    // depth first mark
    var markChild = function (node) {
      node.sourceLinks.forEach(function (d, i) {
        var child = d.target;
        var removable = child.targetLinks.every(function (d, i) {
          return d.source.removable;
        });
        if (removable) {
          child.removable = true;
          child.sourceLinks.forEach(function (d, i) {
            d.removable = true;
          });
          child.targetLinks.forEach(function (d, i) {
            d.removable = true;
          });
          markChild(child);
        }
      });
    };
    markChild(node);
    // root node itself need not to remove
    node.removable = undefined;
    // traversal nodes and links to remove
    flowData.nodes = flowData.nodes.filter(function (d) {
      return !d.removable;
    });
    flowData.links = flowData.links.filter(function (d) {
      return !d.removable;
    });

    //rerender
    render(flowData);
  };
  
  /* 添加数据 */
  var addData = this.addData = function (newData) {
    flowData.nodes = flowData.nodes.concat(newData.nodes);
    flowData.links = flowData.links.concat(newData.links);
    render(flowData);
  };

  /* 清空数据 */
  var cleanData = this.cleanData = function () {
    flowData.nodes = [];
    flowData.links = [];
    render(flowData);
  };

  /* 设置图的状态 move 或者 select, move状态鼠标拖动图片平移。select状态拖动效果可以是平移图片或框选多个节点，可通过multiSelect设定。*/
  var setState = this.setState = function (state) {
    if (state === 'move') {
      selectDragging = false;
      cover.show();
    } else if (state === 'select') {
      handDragging = false;
      cover.hide();
    }
  };

  /* 开启关闭多选功能 */
  var setMultiSelect = this.setMultiSelect = function (b) {
    if (b === true) {
      multiSelect = true;
    } else {
      multiSelect = false;
    }
  };

  /* 高亮某个节点 */
  var highlightNode = this.highlightNode = function (foreignNode) {
    var node = $(foreignNode).parent().parent();
    var id = node.attr("param");
    node.attr("class", "node selected");
    nodesSelected[id] = node;
  };

  /* 不高亮某个节点 */
  var lowlightNode = this.lowlightNode = function (foreignNode) {
    var node = $(foreignNode).parent().parent();
    var id = node.attr("param");
    node.attr("class", "node");
    delete nodesSelected[id];
  };

  /* 高亮某个节点的连线 */
  var highlightNodeLinks = this.highLightNodeLinks = function (node) {
    if (node.id === highlightNodeId) {
      lowlightNodeLinks();
      return;
    } else {
      lowlightNodeLinks();
      highlightNodeId = node.id;
    }
    highlightedNodeLinks = [];
    node.sourceLinks.concat(node.targetLinks).forEach(function (d) {
      var elem = d._elem;
      $(elem).attr("class", "link highlightNodeLink");
      highlightedNodeLinks.push(elem);
    });
  };
  /* 不高亮某个节点的连线 */
  var lowlightNodeLinks = this.lowLightNodeLinks = function (node) {
    highlightNodeId = undefined;
    highlightedNodeLinks.forEach(function (d) {
      $(d).attr("class", "link");
    });
    highlightedNodeLinks = [];
  };

  // 输入node ID, 返回node 数据对象
  var getNodeById = this.getNodeById = function (id) {
    var i, l;
    var nodes = flowData.nodes;
    for (i = 0, l = nodes.length; i < l; i++) {
      if (nodes[i].id === id) {
        return nodes[i];
      }
    }
    return undefined;
  };

  // 调整图片大小
  var resize = this.resize = function (w, h) {
    //alert('resize');
    svg.attr("width", w)
      .attr("height", h);
    vb = [vb[0], vb[1], vb[2] * w / width, vb[3] * h / height];
    resetViewBox();
    cover.css({"width": w, "height": h});
    width = w;
    height = h;
  };

  if (typeof flowData !== 'undefined') {
    render();
  }
};
window.Dag = Dag;

