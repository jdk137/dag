define(['d3'], function (d3) {
d3.sankey = function() {
  var sankey = {},
      paddingSpaceRatio = 0.2; // nodePadding / (nodePadding + nodeSpace);
      nodes = [],
      links = [];

  var nodePadding; // padding ratio between nodes in same level 
  var nodeSpace;   //node space ratio
  var nodesByLevel;

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

  sankey.nodePadding = function() {
    return nodePadding;
  };

  sankey.nodeSpace = function() {
    return nodeSpace;
  };

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
    nodes = nodes.reverse().filter(function (node) {
      if (typeof nodeHash[node.id] !== 'undefined') {
        return false;
      }
      nodeHash[node.id] = node;
      return true;
    }).reverse();
    // remove duplicated link
    links = links.reverse().filter(function (link) {
      var key = (typeof link.source === 'string' ? link.source : link.source.id) + '_' + (typeof link.target === 'string' ? link.target : link.target.id);
      if (typeof linkHash[key] !== 'undefined') {
        return false;
      }
      linkHash[key] = link;
      return true;
    }).reverse();

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
    var remainingNodes = nodes,
        nextNodes,
        x = 0;
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

    //没有父节点，有子节点的节点尽量移向目标节点。
    nodes.forEach(function (node) {
      if (node.targetLinks.length > 0 || node.sourceLinks.length === 0) {
        return;
      }
      var minTargetLevel = d3.min(node.sourceLinks, function (d) {
        return d.target.x;
      });
      if (minTargetLevel - node.x > 1) {
        node.x = minTargetLevel - 1;
      }
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
        .sortKeys(d3.ascending)
        .entries(nodes)
        .map(function(d) { return d.values; });

    initializeNodeDepth();
    resolveCollisions();
    //for (var alpha = 1; iterations > 0; --iterations) {
    for (var alpha = 0.99; iterations > 0; --iterations) {
      relaxRightToLeft2(alpha *= .99);
      resolveCollisions();
      relaxLeftToRight2(alpha);
      resolveCollisions();
    }

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

    function resolveCollisions() {
      nodesByLevel.forEach(function(nodes) {
        var node,
            dy,
            y0 = 0,
            n = nodes.length,
            i;
        var initCenter;
        var newCenter;

        nodes.sort(ascendingDepth);
        initCenter = (nodes[n - 1].y + nodes[n - 1].dy - nodes[0].y) / 2;

        // Push any overlapping nodes down.
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y0 - node.y;
          if (dy > 0) node.y += dy;
          y0 = node.y + node.dy + nodePadding;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y0 - nodePadding - 1;// total = 1
        if (dy > 0) {
          y0 = node.y -= dy;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y + node.dy + nodePadding - y0;
            if (dy > 0) node.y -= dy;
            y0 = node.y;
          }
        }

        newCenter = (nodes[n - 1].y + nodes[n - 1].dy - nodes[0].y) / 2;
        var trans = newCenter - initCenter;
        for (i = 0; i < n; i++) {
          nodes[i].y -= trans;
        }
      });
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
        link.sr = (((i + 1) / (arr.length + 1) - 0.5) * 0.6 + 0.5) * nodeSpace;
      });
      node.targetLinks.forEach(function(link, i, arr) {
        link.tr = (((i + 1) / (arr.length + 1) - 0.5) * 0.6 + 0.5) * nodeSpace;
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
return d3.sankey;
});
