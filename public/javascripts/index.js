var socket = io.connect('http://' + window.location.hostname + ':3000');

(function(){
  function get (id, tag) {
    if (tag) {
      var tagname, tagindex;
      /([a-z]+)(\d+)/.test(tag);
      tagname = RegExp.$1;
      tagindex = Number(RegExp.$2);

      return document.getElementById(id).getElementsByTagName(tagname)[tagindex];
    } else {
      return document.getElementById(id);
    }
  }

  function Chatroom(){
    this.logintext = get("login","input0");
    this.loginbtn = get("login","input1");
    this.countobj = get("count","span0");
    this.showobj = get("message","ul0");
    this.userlist = get("userlist","ol0");
    this.messagetext = get("send","input0");
    this.messagebtn = get("send","input1");
    this.scrolltoggle = true;
  }

  /* 登陆功能开始 */

  Chatroom.prototype.doLogin = function(){ // 登陆
    var that = this;

    that.loginbtn.onclick = function(){ // 点击登陆按钮
      that.loginVerification();
    };

    that.doKeydown(that.logintext, that.loginVerification); // 回车提交
  };

  Chatroom.prototype.loginVerification = function(){ // 登陆验证
    var that = this;

    if (that.logintext.value.replace(/^\s+|\s+$/, "") === "") { // 空名字验证
      alert("用户名不嫩为空");
      that.logintext.value = "";
      return;
    }

    if (that.logintext.value.length >= 8) { // 大于8位名字验证
      alert("此名太长太拉轰，名字长度应为1~8个字符。");
      return;
    }

    if (/.*(李|li)+.*(鹏|朋|peng|月|月鸟)*.*/gi.test(that.logintext.value)) { // 防被黑验证
      alert("黑我的推出去枪毙五分钟。");
      return false;
    }

    socket.emit("login", that.logintext.value, function (result) { // 防止重名验证
      if (typeof(result) === "string" && result.length) {
        alert(result);
        return;
      }

      if (typeof(result) === "boolean" && result) {
        get("l").style.display = "none";
        get("d").style.display = "block";
        that.loadUser();
        that.doMessage();
        Chatroom.prototype.myname = that.logintext.value;
      } else {
        alert("用户名已经存在");
        return;
      }
    });
  };

  /* 用户系统开始 */

  Chatroom.prototype.loadUser = function(){ // 载入用户
    var that = this;

    socket.on('user', function (data) {
      var length = data.namelist.length,
          listhtml = "";

      that.countobj.innerHTML = length; // 载入在线人数

      for (var i = 0; i < length; i++) {
        if (Chatroom.prototype.myname === that.stringEncode(data.namelist[i])) {
          listhtml += "<li class='text-success'>" + that.stringEncode(data.namelist[i]) + "</li>"
        } else {
          listhtml += "<li>" + that.stringEncode(data.namelist[i]) + "</li>"
        }
      }

      that.userlist.innerHTML = listhtml; // 载入用户列表
    });
  };

  /* 聊天系统开始 */

  Chatroom.prototype.doMessage = function(){ // 聊天
    var that = this;

    that.messagebtn.onclick = function(){
      that.sendMessage();
      return false;
    };

    that.getHistoryMessage(); // 获取历史消息
    that.doKeydown(that.messagetext, that.sendMessage);
    that.showobj.style.width = parseInt(get("message", "div0").offsetWidth) - 20 + "px";
  };

  Chatroom.prototype.sendMessage = function(){ // 发信息
    var that = this;

    if (that.messagetext.value.replace(/^\s+|\s+$/, "") === ""){ // 发送信息为空的验证
      return;
    }

    socket.emit("to server", { message : that.messagetext.value });
    that.messagetext.value = ""; // 发送完清空信息
  };

  Chatroom.prototype.getHistoryMessage = function(){ // 获取近20条历史消息
    var that = this, message = "", time = "", date = "", infor = "", name = "";

    socket.on("history message", function (json) {
      for (var i = json.length - 1; i >= 0; i--) {
        date = new Date(parseInt(json[i].time)).toLocaleDateString();
        time = new Date(parseInt(json[i].time)).toString().match(/\d+:\d+:\d+/);
        name = that.stringEncode(json[i].from);
        infor = that.stringEncode(json[i].content);
        infor = that.getExpression(infor);
        infor = that.addLink(infor);

        message += "<li>" +
          "<div><em>" + name + " (" + date + " " + time + "):</em></div>" +
          "<div class='c'>" + infor + "</div>" +
        "</li>";
      };

      that.showobj.innerHTML = message;

      that.getMessage();
      that.autoScroll();
    });
  };

  Chatroom.prototype.getMessage = function(){ // 收信息
    var that = this, message = that.showobj.innerHTML, time = "", date = "", infor = "", name = "";

    socket.on('to broswer', function (data) {
      date = new Date(parseInt(data.date)).toLocaleDateString();
      time = new Date(parseInt(data.date)).toString().match(/\d+:\d+:\d+/);
      name = that.stringEncode(data.username);
      infor = that.stringEncode(data.message);
      infor = that.getExpression(infor);
      infor = that.addLink(infor);

      if (Chatroom.prototype.myname === name) {
        message += "<li>" +
          "<div><em class='text-success'>" + name + " (" + date + " " + time + "):</em></div>" +
          "<div class='c'>" + infor + "</div>" +
        "</li>";
      } else {
        message += "<li>" +
          "<div><em>" + name + " (" + date + " " + time + "):</em></div>" +
          "<div class='c'>" + infor + "</div>" +
        "</li>";
      }

      that.showobj.innerHTML = message;

      that.autoScroll();
      that.stopScroll();
    });
  };

  Chatroom.prototype.autoScroll = function(){ // 自动滚动功能
    var outer = get("message", "div0"), that = this;

    if (parseInt(that.showobj.offsetHeight) - parseInt(outer.offsetHeight) > 0 && this.scrolltoggle) { // 聊天内容区域 > 限制区域
      outer.scrollTop = parseInt(that.showobj.offsetHeight) - parseInt(outer.offsetHeight);
    }
  }

  Chatroom.prototype.stopScroll = function(){ // 停止滚动
    var that = this;

    get("message", "div0").onscroll = function(){
      if (this.scrollTop === parseInt(that.showobj.offsetHeight) - parseInt(get("message", "div0").offsetHeight)) {
        that.scrolltoggle = true;
      } else {
        that.scrolltoggle = false;
      }
    };
  };

  /* 表情功能开始 */

  Chatroom.prototype.expressionEvent = function(){
    var btn = get("pb"),
        layer = get("expression");

    btn.onmouseover = function(){
      layer.style.display = "block";
    };

    btn.onmouseout = function(){
      layer.style.display = "none";
    };

    this.sendExpression();
  };

  Chatroom.prototype.sendExpression = function(){ // 发送表情代号
    var allexpression = get("expression").getElementsByTagName("li"), that = this;

    expression.onclick = function (ev) {
      var ev = ev || window.event;
      var target = ev.target || ev.srcElement;

      if (target.tagName.toLowerCase() === "img") {
        that.messagetext.value += target.getAttribute("data-eindex");
        that.messagetext.focus();
        get("expression").style.display = "none";
      }
    };
  };

  Chatroom.prototype.getExpression = function (str) { // 代号转换成表情
    return str.replace(/\/e(\d{1,3})/g, function(t){
      return "<img src='images/QQexpression/" + RegExp.$1 + ".gif'/>";
    });
  };

  /* 添加连接 */

  Chatroom.prototype.addLink = function (str) {
    var reg = /[a-zA-z]+:\/\/[^s]*/; // 例：http://www.baidu.com
    var reg2 = /[w]{3}\.[^s]*\.[^s]*/; // www.baidu.com

    if (reg.test(str)) {
      return '<a href="' + str + '" target="_blank">' + str + '</a>';
    } else if (reg2.test(str)) {
      return '<a href="http://' + str + '" target="_blank">' + str + '</a>';
    } else {
      return str;
    }
  };

  /* 工具方法开始 */

  Chatroom.prototype.doKeydown = function (obj, callback) { // 键盘按下
    var that = this;

    obj.onkeydown = function (ev) {
      var ev = window.event || ev;

      if (ev.keyCode === 13) {
        callback && callback.call(that);
      }
    };
  }


  Chatroom.prototype.stringEncode = function (str) { // 字符转译
    var div = document.createElement('div');

    if (div.innerText) {
      div.innerText = str;
    } else {
      div.textContent = str;//Support firefox
    }

    return div.innerHTML;
  }

  // Chatroom.prototype.unix_to_datetime = function (unix) { // 时间戳转日期
  //   var now = new Date(parseInt(unix) * 1000);
  //   return now.toLocaleString().replace(/年|月/g, "-").replace(/日/g, " ");
  // };

  Chatroom.prototype.init = function(){ // 初始化方法
    this.doLogin();
    this.expressionEvent();
  };

  var chatroom1 = new Chatroom();
  chatroom1.init();
})();