/* sankey */
d3.sankey = function() {
  var sankey = {},
      paddingSpaceRatio = 0.2; // nodePadding / (nodePadding + nodeSpace);
      nodes = [],
      links = [];

  var nodePadding; // padding ratio between nodes in same level 
  var nodeSpace;   //node space ratio
  var nodesByLevel = [];
  var nodeLinkByLevel = [];
  var margin = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  };
  var linkCombine = false;
  

  var width;
  var height;
  var nnSpace = 40;
  var nlSpace = 40;
  var llSpace = 60;

  var levelPadding = 40;
  var levelPaddings = [];

  var defaultNodeWidth = 160; 
  var defaultNodeHeight = 40; 
  var paddingLineSpace = 10;

  sankey.paddingSpaceRatio = function(_) {
    if (!arguments.length) return paddingSpaceRatio;
    paddingSpaceRatio = +_;
    return sankey;
  };

  sankey.nodes = function(_) {
    if (!arguments.length) return nodes;
    nodes = _;
    return sankey;
  };

  sankey.links = function(_) {
    if (!arguments.length) return links;
    links = _;
    return sankey;
  };

  sankey.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return sankey;
  };

  sankey.linkCombine = function(_) {
    if (!arguments.length) return linkCombine;
    linkCombine = _;
    return sankey;
  };

  sankey.defaultNodeWidth = function(_) {
    if (!arguments.length) return defaultNodeWidth;
    defaultNodeWidth = _;
    return sankey;
  };

  sankey.defaultNodeHeight = function(_) {
    if (!arguments.length) return defaultNodeHeight;
    defaultNodeHeight = _;
    return sankey;
  };

  sankey.paddingLineSpace = function(_) {
    if (!arguments.length) return paddingLineSpace;
    paddingLineSpace = _;
    return sankey;
  };

  sankey.width = function(_) {
    return width;
  };

  sankey.height = function(_) {
    return height;
  };

  /*
  sankey.nodePadding = function() {
    return nodePadding;
  };

  sankey.nodeSpace = function() {
    return nodeSpace;
  };
  */

  sankey.nodesByLevel = function() {
    return nodesByLevel;
  };

  sankey.layout = function(iterations) {
    //init data structure
    computeNodeLinks();
    //init node level
    computeNodeLevels();
    //init node pos ratio
    computeNodeDepths(iterations);
    //init link pos ratio
    computeLinkDepths();

    var levelSpace = defaultNodeHeight;
    var levelPadding = defaultNodeHeight;
    var levelTotalSpace = levelSpace + levelPadding;
    var arrowSpace = 5;
    levelPaddings = [];
    nodeLinkByLevel.forEach(function (d, i) {
      if (i === nodeLinkByLevel.length - 1) {
        levelPaddings[i] = 0;
      } else {
        levelPaddings[i] = Math.max(arrowSpace + (d.nodesAsSourceNum + 1) * paddingLineSpace, levelPadding); 
      }
    });
    var paddingSum = [];
    var sum = 0;
    levelPaddings.forEach(function (d, i) {
      paddingSum[i] = sum;
      sum += d;
    });

    //height = nodesByLevel.length * levelTotalSpace - levelPadding + margin.top + margin.bottom;
    height = paddingSum[paddingSum.length - 1] + levelSpace * nodesByLevel.length + margin.top + margin.bottom;
    //to do: link's y also need to consider
    width = d3.max(nodes, function (d) { return d.y + d.w; }) - d3.min(nodes, function (d) { return d.y; }) + 2 * nlSpace + margin.left + margin.right;
    //width = 160 / nodeSpace + margin.left + margin.right;
    nodes.forEach(function (d, i) {
      var pos = d.pos = {
        level: d.x
      };
      // vertical
      pos.x = d.y + margin.left;
      pos.w = d.w;
      //pos.y = levelTotalSpace * pos.level + margin.top;
      pos.y = paddingSum[pos.level] + levelSpace * pos.level + margin.top;
      pos.h = levelSpace;
      pos.x2 = pos.x + pos.w;
      pos.y2 = pos.y + pos.h;
    });

    var getRatio = function (idx, length) {
      var newIdx = -(length - 1) + idx * 2;
      if (newIdx > 0) {
        newIdx -= 1;
      }
      newIdx = Math.abs(newIdx);
      return (newIdx + 1 ) / (length + 1);
    };
    links.forEach(function (d, i) {
      var pos = d.pos = {};
      // vertical
      var sp = d.source.pos;
      var tp = d.target.pos;
      pos.y0 = sp.y + sp.h;
      pos.y1 = tp.y;
      pos.x0 = sp.x + d.sr;
      pos.x1 = tp.x + d.tr;
      pos.turnY = pos.y0 + (levelPaddings[d.source.pos.level] - arrowSpace) * getRatio(d.source.linkLevelIndex, nodeLinkByLevel[d.source.pos.level].nodesAsSourceNum);
      //pos.turnY = pos.y0 + (levelPaddings[d.source.pos.level] - arrowSpace) * (1 + d.source.linkLevelIndex) / (nodeLinkByLevel[d.source.pos.level].nodesAsSourceNum + 1);
      //pos.turnY = pos.y0 + levelPadding * (1 + d.source.levelIndex)  / (d.source.levelEls.length + 1);
    });
    return sankey;
  };

  sankey.relayout = function() {
    computeLinkDepths();
    return sankey;
  };

  // Populate the sourceLinks and targetLinks for each node.
  // Also, if the source and target are not objects, assume they are indices.
  function computeNodeLinks() {
    var nodeHash = {};
    var linkHash = {};
    // remove duplicated node
    nodes = nodes.filter(function (node) {
      if (typeof nodeHash[node.id] !== 'undefined') {
        $.extend(nodeHash[node.id], node);
        return false;
      }
      nodeHash[node.id] = node;
      return true;
    });
    // remove duplicated link
    links = links.filter(function (link) {
      var id1 = typeof link.source === 'string' ? link.source : link.source.id;
      var id2 = typeof link.target === 'string' ? link.target : link.target.id;
      if (typeof nodeHash[id1] === 'undefined' || typeof nodeHash[id2] === 'undefined') {
        return false;
      }
      var key = id1 + '_' + id2;
      if (typeof linkHash[key] !== 'undefined') {
        //$.extend(linkHash[key], link);
        return false;
      }
      linkHash[key] = link;
      return true;
    });

    nodes.forEach(function(node) {
      //nodeHash[node.id] = node;
      node.sourceLinks = [];
      node.targetLinks = [];
    });
    links.forEach(function(link) {
      var source = link.source,
          target = link.target;
      
      if (typeof source === "string") source = link.source = nodeHash[link.source];
      if (typeof target === "string") target = link.target = nodeHash[link.target];
      
      source.sourceLinks.push(link);
      target.targetLinks.push(link);
    });
  }

  // Iteratively assign the breadth (x-position) for each node.
  // Nodes are assigned the maximum breadth of incoming neighbors plus one;
  // nodes with no incoming links are assigned breadth zero, while
  // nodes with no outgoing links are assigned the minimum breadth.
  function computeNodeLevels() {
    nodes.forEach(function (d) {
      d._linkNumber = d.sourceLinks.length + d.targetLinks.length;
      d._levelSetted = false;
    });
    var x = 0;
    var remainingNodes,
        nextNodes;
    var boneNodes;

    // get bone nodes
    var shrink = true;
    remainingNodes = nodes;
    while (shrink) {
      shrink = false;
      nextNodes = [];
      remainingNodes.forEach(function(node) {
        if (node._linkNumber === 1) {
          shrink = true;
          node._linkNumber = 0;
          node.sourceLinks.forEach(function (d) {
            if (d.target._linkNumber > 0) {
              d.target._linkNumber -= 1;
            }
          });
          node.targetLinks.forEach(function (d) {
            if (d.source._linkNumber > 0) {
              d.source._linkNumber -= 1;
            }
          });
        }
      });
      remainingNodes = remainingNodes.filter(function (d) {
        return d._linkNumber > 0;
      });
    }
    boneNodes = remainingNodes;

    if (boneNodes.length > 0) {
      //有环
      remainingNodes = boneNodes;
      x = 0;
      nextNodes = [];
      while (remainingNodes.length) {
        nextNodes = [];
        remainingNodes.forEach(function(node) {
          node.x = x;
          node.sourceLinks.forEach(function(link) {
            nextNodes.push(link.target);
          });
        });
        remainingNodes = nextNodes;
        ++x;
      }

      boneNodes.forEach(function (node) {
        node._isBone = true;
      });
      boneNodes.forEach(function (node) {
        var parentBoneNode = [];
        node.targetLinks.forEach(function (d) {
          if (d.source._isBone) {
            parentBoneNode.push(d.source);
          }
        });
        var childrenBoneNode = [];
        node.sourceLinks.forEach(function (d) {
          if (d.target._isBone) {
            childrenBoneNode.push(d.target);
          }
        });
        node._parentBoneNode = parentBoneNode;
        node._childrenBoneNode = childrenBoneNode;
      });
      // move down to make links to be shortest
      boneNodes.forEach(function (node) {
        var minChildrenLevel = d3.min(node._childrenBoneNode, function (d) {
          return d.x;
        });
        // not parent bone node
        if (node._parentBoneNode.length === 0) {
          node.x = minChildrenLevel - 1;
        }
        // target is far away
        if (minChildrenLevel - node.x > 1) {
          if (node._childrenBoneNode.length > node._parentBoneNode.length) {
            // parents more than children, do nothing
          } else if (node._childrenBoneNode.length < node._parentBoneNode.length) {
            // parents less than children, move to children
            node.x = minChildrenLevel - 1;
          } else {
            // parents = children, do nothing;
          }
        }
      });
    } else {
      //无环
      if (nodes.length > 0) {
        nodes[0].x = 0;
        boneNodes = [nodes[0]];
      } else {
        boneNodes = [];
      }
    }

    // 添加节点
    boneNodes.forEach(function (d) {
      d._levelSetted = true;
    });
    remainingNodes = boneNodes;
    nextNodes = [];
    while (remainingNodes.length) {
      nextNodes = [];
      remainingNodes.forEach(function(node) {
        node.sourceLinks.forEach(function(link) {
          var n = link.target;
          if (!n._levelSetted) {
            n.x = node.x + 1;
            node._levelSetted = true;
            nextNodes.push(n);
          }
        });
        node.targetLinks.forEach(function(link) {
          var n = link.source;
          if (!n._levelSetted) {
            n.x = node.x - 1;
            node._levelSetted = true;
            nextNodes.push(n);
          }
        });
      });
      remainingNodes = nextNodes;
    }
    //调整节点的最小层为0
    var minLevel = d3.min(nodes, function (d) { 
      return d.x;
    });
    nodes.forEach(function (d) {
      d.x -= minLevel;
    });
  }

  function moveSourcesRight() {
    nodes.forEach(function(node) {
      if (!node.targetLinks.length) {
        node.x = d3.min(node.sourceLinks, function(d) { return d.target.x; }) - 1;
      }
    });
  }

  function moveSinksRight(x) {
    nodes.forEach(function(node) {
      if (!node.sourceLinks.length) {
        node.x = x - 1;
      }
    });
  }

  function scaleNodeBreadths(kx) {
    nodes.forEach(function(node) {
      node.x *= kx;
    });
  }

  function computeNodeDepths(iterations) {
    nodesByLevel = d3.nest()
        .key(function(d) { return d.x; })
        //.sortKeys(d3.ascending)
        .sortKeys(function (a, b) { return a - b; })
        .entries(nodes)
        .map(function(d) { return d.values; });

    // get sequence;
    initializeNodeDepth();
    //force layout in y dimension to get sequence
    forceLayout(5);
    setNodeLinkByLevel();
    reorderNodeLink(50);
    // get location;
    //resolveCollisions();

    /*
    initializeNodeDepth();
    resolveCollisions();
    for (var alpha = 0.99; iterations > 0; --iterations) {
      relaxRightToLeft2(alpha *= .99);
      resolveCollisions();
      relaxLeftToRight2(alpha);
      resolveCollisions();
    }
    */

    function initializeNodeDepth() {
      nodeSpace = d3.min(nodesByLevel, function(nodes) {
        return 1 / (nodes.length - paddingSpaceRatio) * (1 - paddingSpaceRatio);
      });
      nodePadding = nodeSpace / (1 - paddingSpaceRatio) * paddingSpaceRatio;

      nodesByLevel.forEach(function(nodes) {
        nodes.forEach(function(node, i, arr) {
          //node.y = 0.5 + (i + 1 / 2 - arr.length / 2) * (nodeSpace + nodePadding) - nodeSpace / 2;
          node.y = (arr.length === 1) ? (0.5 - nodeSpace / 2) : i / (arr.length - 1) * (1 - nodeSpace);
          node.dy = nodeSpace;
        });
      });
    }

    function forceLayout (iteration) {
      nodes.forEach(function (d) {
        d.y -= 0.5;
        d._y = d.y + d.dy / 2;
      });
      // determin node sequence
      for (var alpha = 0.99; iterations > 0; --iterations) {
        alpha *= alpha;
        nodesByLevel.forEach(function (levelNodes) {
          levelNodes.forEach(function (node) {
            var y = d3.sum(node.sourceLinks, function (link) {
              return link.target._y * (1 + Math.abs(link.target.x - node.x) / 10);
            });
            y += d3.sum(node.targetLinks, function (link) {
              return link.source._y * (1 + Math.abs(link.source.x - node.x) / 10);
            });
            y = y / (node.sourceLinks.length + node.targetLinks.length);
            node._y += (y - node._y) * alpha;// * 2;
          });
        });
        nodes.forEach(function (node) {
          node.y = node._y;
        });
      }
      //
      /*
      console.log(nodes);
      nodesByLevel.forEach(function (levelNodes) {
        levelNodes.sort(function (a, b) {
          return a.y - b.y;
        });
        levelNodes.forEach(function (d, i) {
          d.levelNodeIndex = i;
        });
      });
      */
    }

    function setNodeLinkByLevel () {
      nodeLinkByLevel = [];
      nodesByLevel.forEach(function (levelNodes) {
        nodeLinkByLevel.push(levelNodes.slice(0));
      });
      nodesByLevel.forEach(function (levelNodes) {
        levelNodes.forEach(function (node) {
          node.sourceLinks.forEach(function (link) {
            var s = link.source;
            var t = link.target;
            link.levelEl = [];
            for (var i = s.x + 1, l = t.x; i < l; i++) {
              var linkLevelEl = {
                level: i,
                link: link,
                w: 0,
                //h: 0,
                y: Math.abs(s.y) > Math.abs(t.y) ? s.y : t.y
              };
              link.levelEl.push(linkLevelEl);
              nodeLinkByLevel[i].push(linkLevelEl);
            }
          });
        });
      });
      nodeLinkByLevel.forEach(function (levelEls) {
        levelEls.sort(function (a, b) {
          return a.y - b.y;
        });
      });
      nodeLinkByLevel.forEach(function (levelEls) {
        var count = -1;
        levelEls.forEach(function (d, i) {
          if (typeof d.sourceLinks !== 'undefined' && d.sourceLinks.length > 0) {
            count += 1;
            d.linkLevelIndex = count;
          }
          
          d.levelIndex = i;
          d.levelEls = levelEls;
        });
        levelEls.nodesAsSourceNum = count + 1;
      });
    }

    //同级拉开间距
    function reorderNodeLink (times) {
      //init
      nodes.forEach(function (d) {
        d.w = d.w || defaultNodeWidth;
        d.h = d.h || defaultNodeHeight;
      });
      nodeLinkByLevel.forEach(function (levelEls) {
        levelEls.forEach(function (el, i) {
          if (i === 0 ) {
            el.y = 0;
          } else {
            var pre = levelEls[i - 1];
            var padding = getElsPadding(pre, el);
            pre._rightPadding = padding;
            pre._rightEl = el;
            el._leftPadding = padding;
            el._leftEl = pre;
            el.y = Math.max(el.y, pre.y + pre.w + padding);
          }
        });
      });
      
      var i;
      for (i = 0; i < times; i++) {
        levelMove();
      }

      //move
      function levelMove () {
        nodeLinkByLevel.forEach(function (levelEls) {
          //total Move
          var step = 10;
          var move = 0;
          var originDis = getLevelDis(levelEls, 0);
          var lastDis;
          var lastMove = 0;
          var recentDis;
          //total move left
          lastDis = originDis;
          move = -step;
          while ((recentDis = getLevelDis(levelEls, move)) < lastDis) {
            lastMove = move;
            move -= step;
            lastDis = recentDis;
          }
          //total move right
          lastDis = originDis;
          move = step;
          while ((recentDis = getLevelDis(levelEls, move)) < lastDis) {
            lastMove = move;
            move += step;
            lastDis = recentDis;
          }
          levelEls.forEach(function (d) {
            //d._y = d.y + lastMove;
            d.y = d.y + lastMove;
          });
  
          //single El move 
          levelEls.forEach(function (el) {
            var step = 10;
            var move = 0;
            var originDis = getElLevelDis(el, 0);
            var lastDis;
            var lastMove = 0;
            var recentDis;
            //single move left
            lastDis = originDis;
            move = -step;
            var leftBound = (typeof el._leftEl === 'undefined')
                          ? -Infinity
                          : el._leftEl.y + el._leftEl.w + el._leftPadding;
            while ((recentDis = getElLevelDis(el, move)) < lastDis && (el.y + move >= leftBound)) {
              lastMove = move;
              move -= step;
              lastDis = recentDis;
            }
            //single move right
            lastDis = originDis;
            move = step;
            var rightBound = (typeof el._rightEl === 'undefined')
                          ? Infinity
                          : el._rightEl.y - el.w - el._rightPadding;
            while ((recentDis = getElLevelDis(el, move)) < lastDis && (el.y + move <= rightBound)) {
              lastMove = move;
              move += step;
              lastDis = recentDis;
            }
            el.y = el.y + lastMove;
            //el._y = el._y + lastMove;
          });
        });

        /*
        nodeLinkByLevel.forEach(function (levelEls) {
          levelEls.forEach(function (el) {
            el.y = el._y;
          });
        });
        */
      };

      function getLevelDis (levelEls, move) {
        return d3.sum(levelEls, function (d) {
          return getElLevelDis(d, move);
        });
      }
      function getElLevelDis (el, move) {
        var getCenter = function (el) {
          return el.y + el.w / 2;
        };
        var getTwoElsDis = function (el1, el2) {
          return Math.abs(getCenter(el1) + move - getCenter(el2));
        };
        //If node has more links, then it's links are more powerful
        var getElPower = function (el) {
          return  1 + (el.sourceLinks.length + el.targetLinks.length) / 100;
        };
        var dis = 0;
        if (typeof el.sourceLinks !== 'undefined') {
          //node
          el.targetLinks.forEach(function (link, i) {
            if (link.levelEl.length === 0) {
              // to node;   
              dis += getTwoElsDis(el, link.source) * getElPower(link.source); 
            } else {
              // to long link
              dis += getTwoElsDis(el, link.levelEl[link.levelEl.length - 1]) * 2;
            }
          });
          el.sourceLinks.forEach(function (link, i) {
            if (link.levelEl.length === 0) {
              // to node
              dis += getTwoElsDis(el, link.target) * getElPower(link.target);
            } else {
              // to long link
              dis += getTwoElsDis(el, link.levelEl[0]) * 2;
            }
          });
        } else {
          //level link
          var sourceLevel = el.link.source.x;
          var preIsNode = el.level === sourceLevel + 1;
          var pre = preIsNode ? el.link.source : el.link.levelEl[el.level - (sourceLevel + 1) - 1];
          var targetLevel = el.link.target.x;
          var proIsNode = el.level === targetLevel - 1;
          var pro = proIsNode ? el.link.target : el.link.levelEl[el.level - (sourceLevel + 1) + 1];
          dis += getTwoElsDis(el, pre) * (preIsNode ? 2 : 3);
          dis += getTwoElsDis(el, pro) * (proIsNode ? 2 : 3);
        }
        return dis;
      }
    }

    function getElsPadding (el1, el2) {
      var type1 = typeof el1.sourceLinks !== 'undefined' ? 'node' : 'link';
      var type2 = typeof el2.sourceLinks !== 'undefined' ? 'node' : 'link';
      if (type1 === 'node' && type2 === 'node') {
        return nnSpace;
      } else if (type1 === 'link' && type2 === 'link') {
        return llSpace;
      } else {
        return nlSpace;
      }
    }

    function relaxLeftToRight2(alpha) {
      nodesByLevel.forEach(function(nodes, breadth) {
        nodes.forEach(function(node) {
          if (node.sourceLinks.length + node.targetLinks.length > 0) {
            var y = (d3.sum(node.sourceLinks, weightedTarget) + d3.sum(node.targetLinks, weightedSource)) / (node.sourceLinks.length + node.targetLinks.length);
            node.y += (y - center(node)) * alpha;
          }
        });
      });

      function weightedTarget(link) {
        return center(link.target);
      }
      function weightedSource(link) {
        return center(link.source);
      }
    }

    function relaxRightToLeft2(alpha) {
      nodesByLevel.slice().reverse().forEach(function(nodes, breadth) {
        nodes.forEach(function(node) {
          if (node.sourceLinks.length + node.targetLinks.length > 0) {
            var y = (d3.sum(node.sourceLinks, weightedTarget) + d3.sum(node.targetLinks, weightedSource)) / (node.sourceLinks.length + node.targetLinks.length);
            node.y += (y - center(node)) * alpha;
          }
        });
      });

      function weightedTarget(link) {
        return center(link.target);
      }
      function weightedSource(link) {
        return center(link.source);
      }
    }

    function relaxLeftToRight(alpha) {
      nodesByLevel.forEach(function(nodes, breadth) {
        nodes.forEach(function(node) {
          if (node.sourceLinks.length) {
            var y = d3.sum(node.sourceLinks, weightedTarget) / node.sourceLinks.length;
            node.y += (y - center(node)) * alpha;
          }
        });
      });

      function weightedTarget(link) {
        return center(link.target);
      }
    }

    function relaxRightToLeft(alpha) {
      nodesByLevel.slice().reverse().forEach(function(nodes) {
        nodes.forEach(function(node) {
          if (node.targetLinks.length) {
            var y = d3.sum(node.targetLinks, weightedSource) / node.targetLinks.length;
            node.y += (y - center(node)) * alpha;
          }
        });
      });

      function weightedSource(link) {
        return center(link.source);
      }
    }

    function ascendingDepth(a, b) {
      return a.y - b.y;
    }
  }

  function computeLinkDepths() {
    nodes.forEach(function(node) {
      node.sourceLinks.sort(ascendingTargetDepth);
      node.targetLinks.sort(ascendingSourceDepth);
    });
    nodes.forEach(function(node) {
      // source ratio and target ratio
      node.sourceLinks.forEach(function(link, i, arr) {
        if (linkCombine === true) {
          link.sr = 0.5 * link.source.w;
        } else {
          link.sr = (((i + 1) / (arr.length + 1) - 0.5) * 0.6 + 0.5) * link.source.w;
        }
      });
      node.targetLinks.forEach(function(link, i, arr) {
        if (linkCombine === true) {
          link.tr = 0.5 * link.target.w;
        } else {
          link.tr = (((i + 1) / (arr.length + 1) - 0.5) * 0.6 + 0.5) * link.target.w;
        }
      });
    });

    function ascendingSourceDepth(a, b) {
      return a.source.y - b.source.y;
    }

    function ascendingTargetDepth(a, b) {
      return a.target.y - b.target.y;
    }
  }

  function center(node) {
    return node.y + node.dy / 2;
  }

  return sankey;
};

