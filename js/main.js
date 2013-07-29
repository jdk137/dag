//d3.json("t_level.json", function(fData) {
//d3.json("twoPartExample.json", function(fData) {
d3.json("standardExample.json", function(fData) {
//d3.json("simpleExample.json", function(fData) {
//d3.json("singleNodeExample.json", function(fData) {
//d3.json("multiNodeExample.json", function(fData) {
//d3.json("10000NodeExample.json", function(fData) {
  var dag = new Dag({
    data: {nodes: [], links: []}, //fData, 详细格式请参考具体数据示例
    container: "chart",
    //width: 800,
    //height: 500,
    levelSpace: 40, //node height
    boxSpace: 160, //node width
    paddingLineSpace: 30,
    //linkCombine: true, // links of same node combine together
    //multiSelect: true,
    /* 选中单个或多个节点时的事件处理函数， 参数为object, key为node ID, value为node数据对象 */
    /* 默认单击某个节点会选中这个节点，所以可以作为单击事件的处理函数*/
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
    /* 鼠标移上某个节点的事件处理函数 */
    nodeHoverInHandle: function (node) {
      console.log("hoverIn " + node.id);
    },
    /* 鼠标移出某个节点的事件处理函数 */
    nodeHoverOutHandle: function (node) {
      console.log("hoverOut " + node.id);
    },
    middleClickHandle: function (node) {
      console.log("middleClick " + node.id);
    },
    nodeClickInHandle: function (node) {
      console.log("nodeClickIn " + node.id);
    },
    nodeClickOutHandle: function (node) {
      console.log("nodeClickOut " + node.id);
    },
    /* 鼠标右击某个节点的事件处理函数， e为事件对象， node为数据对象*/
    rightClickHandle: function (e, node) {
      /*
      console.log($('g.node[param="' + node.id + '"]'));
      console.log(node.id);
      console.log(node);
      */
      var random = Math.round(Math.random() * 100);
      var newId = node.id + "-" + random;
      var newId2 = node.id + "-" + (random + 1);
      var newId3 = node.id + "-" + (random + 2);
      var newData = {
        nodes: [
               {id: newId, name: newId},
               {id: newId2, name: newId},
               {id: newId3, name: newId},
               {id: node.id, name: node.id}
               ],
        //links: [{source: newId, target: node.id}, {source: '-1', target: node.id}]
        links: [
          {source: node.id, target: newId},
          {source: node.id, target: newId2},
          {source: node.id, target: newId3},
          {source: '-1', target: node.id}
        ]
      };
      //dag.addData(newData);
      dag.cleanData();
      /*
      dag.maximizeViewBox();
      */
      /*
      console.log(node.pos);
      dag.maximizeViewBox(function () {
          dag.focusViewBoxOnNode(node);
      });
      */
    },
    /* 鼠标右键双击某个节点的事件处理函数， e为事件对象， node为数据对象*/
    doubleRightClickHandle: function (e, node) {
      console.log('double right click', node.id);
      dag.cleanNodeChildren(node);
    },
    /* 最重要的函数，可以绘制节点的内容。内容可以是html5的div dom 节点。可以绑定双击、单击事件。并可以将dom节点绑定到数据对象中*/
    drawNode: function (node) {
      var c = $('<div xmlns="http://www.w3.org/1999/xhtml"></div>')
          .attr("class", "foreignNode") // warning! to this app, class='foreignNode' is necessary.
          .css({
            'background-color': "green"
          });
      var top = $('<div class="node-content">'
          + '<div class="node-icon">&nbsp;</div>'
          + '<div class="node-name">' + node.name + '</div>'
          + '</div>'
          );
      var bottom = $('<div class="node-bar">'
          + '<div class="node-type">' + 'virtualNode' + '</div>'
          + '</div>'
          );
      $('<div/>').append(top).append(bottom).appendTo(c);
      node._elem = c; //将dom节点绑定到数据对象中
      $(this).append(c);
    }
  });

  dag.setMultiSelect(true); //开启多选
  dag.addData(fData); //添加数据
  dag.render(); //渲染

  /*
  var myData = dag.dump(); //返回节点和链接的结构数据
  dag.setZoomCenter('mousePoint'); // 设置缩放中心点，可以mousePoint或者imageCenter
  dag.cleanNodeChildren(fData.nodes[0]) // 清空某节点的子节点的数据(不包括本身)，并重新渲染。 参数为node节点对象
  dag.addData(newData); // 添加数据
  dag.cleanData(); // 清空所有数据
  dag.setState('move'); // 设置图的状态 move 或者 select, move状态鼠标拖动图片平移。select状态拖动效果可以是平移图片或框选多个节点，可通过multiSelect设定。
  dag.setMultiSelect(true); // 开启关闭多选功能
  dag.highlightNode($('.foreignNode')[0]); //高亮某个节点
  dag.lowlightNode($('.foreignNode')[0]); //不高亮某个节点
  dag.highlightNodeLinks(node); // 高亮某个节点的连线
  dag.lowlightNodeLinks(node); // 不高亮某个节点的连线
  dag.getNodeById(); // 输入node ID, 返回node 数据对象
  dag.resize(); // 调整图片大小
  dag.zoomIn(config); //放大, config可以为空
  dag.zoomOut(config); //缩小，config可以为空
  dag.animateViewBox(b, cb); //视窗变动动画。b为viewbox: [x, y, width, height], cb为回调函数。
  dag.maximizeViewBox(cb); //最大化视窗
  dag.focusViewBoxOnNode(node, cb); //聚焦视窗于某个节点
  */

  //dag.highlightNode(dag.getNodeById('303009')._elem);

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
    dag.setZoomCenter('mousePoint');
  });
  $("#select").click(function () {
    dag.setState("select");
    $("#select").css({"background-color": "gray"});
    $("#move").css({"background-color": "white"});
    dag.setZoomCenter('imageCenter');
  }); 
});
