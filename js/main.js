require.config({
　　baseUrl: "js/",
    shim: {
        d3: {
            exports: 'd3'
        }
    },    
    paths: {
      'jquery1.7': 'jquery-1.7.1',
      'ratioSankey': 'ratioSankey',
      'Dag': 'dag'
    }
});
define(['jquery1.7', 'd3', 'Dag'], function ($, d3, Dag) {
  //d3.json("t_level.json", function(fData) {
  d3.json("twoPartExample.json", function(fData) {
  //d3.json("simpleExample.json", function(fData) {
  //d3.json("singleNodeExample.json", function(fData) {
  //d3.json("multiNodeExample.json", function(fData) {
  //d3.json("10000NodeExample.json", function(fData) {
    var dag = new Dag({
      data: {nodes: [], links: []}, //fData,
      container: "chart",
      width: 800,
      height: 500,
      levelSpace: 40, //node height
      boxSpace: 160, //node width
      selectNodeHandle: function (nodesSelected) {
        /*
        for (var key in nodesSelected) {
          var node = nodesSelected[key];
          var id = key;
          var data = node[0].__data__;
          console.log(node, id, data);
        }
        */
        //console.log(nodesSelected);
      },
      nodeHoverInHandle: function (node) {
        console.log("hoverIn " + node.id);
      },
      nodeHoverOutHandle: function (node) {
        console.log("hoverOut " + node.id);
      },
      rightClickHandle: function (e, node) {
        /*
        console.log($('g.node[param="' + node.id + '"]'));
        console.log(node.id);
        console.log(node);
        */
        /*
        var newId = node.id + "-" + Math.round(Math.random() * 100);
        var newData = {
          nodes: [{id: newId, name: newId}],
          links: [{source: newId, target: node.id}]
        };
        dag.addData(newData);
        */
        /*
        dag.maximizeViewBox();
        */
        console.log(node.pos);
        dag.maximizeViewBox(function () {
            dag.focusViewBoxOnNode(node);
        });
      },
      doubleRightClickHandle: function (e, node) {
        console.log('double right click', node.id);
        dag.cleanNodeChildren(node);
      },
      drawNode: function (d) {
        var c = $('<div xmlns="http://www.w3.org/1999/xhtml"></div>')
            .attr("class", "foreignNode")
            .css({
              'width': d.width,
              'height': d.height,
              'background-color': "green"
            });
        var top = $('<div class="node-content">'
            + '<div class="node-icon">&nbsp;</div>'
            + '<div class="node-name">' + d.name + '</div>'
            + '</div>'
            );
        var bottom = $('<div class="node-bar">'
            + '<div class="node-type">' + 'virtualNode' + '</div>'
            + '</div>'
            );
        $('<div/>').append(top).append(bottom).appendTo(c);
        $(this).append(c);
      }
    });
  
    dag.addData(fData);
    dag.render();
  
    // button click
    $("#addData").on("click", function () {
        d3.json("addData.json", dag.addData);
    });
    $("#zoomIn").on("click", dag.zoomIn);
    $("#zoomOut").on("click", dag.zoomOut);
    $("#move").click(function () {
      dag.setState("move");
      $("#select").css({"background-color": "white"});
      $("#move").css({"background-color": "gray"});
    });
    $("#select").click(function () {
      dag.setState("select");
      $("#select").css({"background-color": "gray"});
      $("#move").css({"background-color": "white"});
    }); 
  });

});
