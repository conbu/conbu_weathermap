// Policy:
//  do not rely on external library, incl jQuery etc.

var defConfig = {
  arrow : { width : 5, head : 10 },
  data  : { url : "", interval : 60 },
  image : { file: "", width : 0, height : 0, locale: undefined, font: 10,
    legend : { x: 20, y: 20, r: 5, sep: 0.3, 
               bar_width: 3, legend_width: 10 },
    lastupdated: { x: 5, y: 5 }
  },
  target: { name: "", maxsave: undefined },
  load  : {},
  load_max: 0,
  na    : "black",
  unit  : "",
  history: [],
  graph_history: { xorig: 260, xwidth: -250, yorig: 50, ywidth: 650 }
};
var defConfigName = 'config.json';
var defSVG = 'http://www.w3.org/2000/svg';
var defXlink = 'http://www.w3.org/1999/xlink';
// has 26 color definitions (13 links) for history graph
// set color with array of config.history to change
var defHColor = [ "black", "blue", "lime", "red", "cyan", "yellow", "magenta",
  "navy", "green", "maroon", "teal", "purple", "olive", "gray", 
  "deepskyblue", "rosybrown", "darkslategray", "tan", "darkviolet", "plum",
  "sienna", "orangered", "brown", "gold", "greenyellow", "deeppink" ];

var config;
var link_lines;
var arrows;
var curExecTime;
var hist_color;

function LoadWeathermap() {
  // load config
  // this is base config, so use main thread but not sub.
  var httpReq = new XMLHttpRequest();
  httpReq.open('GET', defConfigName, false);
  httpReq.send();
  var num_load;
  if (httpReq.status === 200) {
    json_load = JSON.parse(httpReq.responseText);
    if (json_load === undefined) {return false; }
    config = defConfig;
    var json_conf = json_load.config;
    if (json_conf.arrow !== undefined) {
      if (json_conf.arrow.width !== undefined)
        {config.arrow.width = json_conf.arrow.width; }
      if (json_conf.arrow.head !== undefined)
        {config.arrow.head = json_conf.arrow.head; }
    }
    if (json_conf.target !== undefined) {
      if (json_conf.target.name !== undefined) {
        config.target.name = json_conf.target.name;
        var re = /\{EVENTNAME\}/;
        if (document.title.match(re)) {
          var tstr = document.title;
          document.title = tstr.replace(re, config.target.name);
        }
      }
      if (json_conf.target.maxsave !== undefined)
        {config.target.maxsave = json_conf.target.maxsave; }
    }
    if (json_conf.image !== undefined) {
      if (json_conf.image.file !== undefined)
        {config.image.file = json_conf.image.file; }
      if (json_conf.image.height !== undefined)
        {config.image.height = json_conf.image.height; }
      if (json_conf.image.width !== undefined)
        {config.image.width = json_conf.image.width; }
      if (json_conf.image.locale !== undefined)
        {config.image.locale = json_conf.image.locale; }
      if (json_conf.image.font !== undefined)
        {config.image.font = json_conf.image.font; }
      if (json_conf.image.legend !== undefined) {
        var jc_legend = json_conf.image.legend;
        if ((jc_legend.x !== undefined) && (jc_legend.x > 0))
          {config.image.legend.x = jc_legend.x; }
        if ((jc_legend.y !== undefined) && (jc_legend.y > 0))
          {config.image.legend.y = jc_legend.y; }
      }
      if (json_conf.image.lastupdated !== undefined) {
        var jc_lu = json_conf.image.lastupdated;
        if ((jc_lu.x !== undefined) && (jc_lu.x > 0))
          {config.image.lastupdated.x = jc_lu.x; }
        if ((jc_lu.y !== undefined) && (jc_lu.y > 0))
          {config.image.lastupdated.y = jc_lu.y; }
      }
    }
    if (json_conf.data !== undefined) {
      if (json_conf.data.url !== undefined)
        {config.data.url = json_conf.data.url; }
      if (json_conf.data.interval !== undefined) {
        if (json_conf.data.interval > 0) {
          config.data.interval = json_conf.data.interval;
        }
      }
    }
    if (json_load.link !== undefined) {link_lines = json_load.link; }
    else {
      console.log("No link defined in config json: " + defConfigName);
      return;
    }
    if (json_conf.load !== undefined) {
      if (json_conf.load.na !== undefined) {config.na = json_conf.load.na; }
      if (json_conf.load.max !== undefined) {config.max = json_conf.load.max; }
      if (json_conf.load.unit !== undefined) {config.unit = json_conf.load.unit; }
      if (config.max !== undefined) {config.max = config.na; }
      num_load = 3; // na, max + title, margin
      Object.keys(json_conf.load).sort(function(a,b) {
        a = parseInt(a);
        b = parseInt(b);
        if (a == 0) { return -1; }
        if (b == 0) { return -1; }
        if (a > b) { return 1; }
        if (a < b) {return -1; }
        return 0;
      }).forEach(function (name) {
        if (name > 0) {config.load[name] = json_conf.load[name]; num_load += 1; }
      });
    } else {
      console.log("No load level defined in config json: " + defConfigName);
      return;
    }
    if (json_conf.history !== undefined) {
      config.history = json_conf.history;
    } else {
      config.history = defHColor;
    }
  } else {
    console.log("Error to load configuration: " + defConfigName);
    return;
  }
  console.log("Configuration loaded successfully: " + defConfigName);

  // constract weathermap display
  var svg_root = document.getElementById('weathermap');
  if (svg_root === undefined) {
    console.log("weathermap SVG element not found.");
    return;
  }
  // weathermap size and background (will not change size of "wmhistory")
  svg_root.setAttribute("width", config.image.width);
  svg_root.setAttribute("height", config.image.height);
  svg_root.setAttribute("viewBox", "0 0 " + config.image.width + " " + config.image.height);
  var elem_img = document.createElementNS(defSVG,'image');
  elem_img.setAttribute("x", 0);
  elem_img.setAttribute("y", 0);
  elem_img.setAttribute("height", config.image.height);
  elem_img.setAttribute("width", config.image.width);
  elem_img.setAttributeNS(defXlink, 'href', config.image.file);
  svg_root.appendChild(elem_img);
  var elem_lastup = document.createElementNS(defSVG, 'text');
  elem_lastup.setAttribute("x", config.image.lastupdated.x);
  elem_lastup.setAttribute("y", config.image.lastupdated.y + config.image.font);
  elem_lastup.setAttribute("font-size", config.image.font);
  elem_lastup.setAttribute("id", 'lastupdated');
  svg_root.appendChild(elem_lastup);

  // weathermap legend
  var obj_il = config.image.legend;
  var elem_leg = document.createElementNS(defSVG, 'rect');
  elem_leg.setAttribute('x', obj_il.x);
  elem_leg.setAttribute('y', obj_il.y);
  elem_leg.setAttribute('rx', obj_il.r);
  elem_leg.setAttribute('ry', obj_il.r);
  elem_leg.setAttribute('width', obj_il.r * 2 + config.image.font * obj_il.legend_width);
  elem_leg.setAttribute('height', obj_il.r * 3 + config.image.font * (num_load * (1.0 + obj_il.sep)));
  elem_leg.setAttribute('fill', 'white');
  elem_leg.setAttribute('stroke', 'black');
  elem_leg.setAttribute('stroke-width', 1);
  svg_root.appendChild(elem_leg);
  var elem_leg_title = document.createElementNS(defSVG, 'text');
  elem_leg_title.setAttribute('x', obj_il.x + obj_il.r);
  elem_leg_title.setAttribute('y', obj_il.y + obj_il.r + config.image.font);
  elem_leg_title.textContent = 'Traffic load (' + config.unit + ')';
  elem_leg_title.setAttribute('font-size', config.image.font + 'px');
  svg_root.appendChild(elem_leg_title);
  // na
  var cid = 1;
  SetLegend(svg_root, obj_il, config.image.font, cid, config.na, 'n/a');
  // foreach
  var val_priv = 0;
  Object.keys(config.load).forEach(function (name) {
    cid += 1;
    SetLegend(svg_root, obj_il, config.image.font, cid, GetColor(name), val_priv + ' - ' + name);
    val_priv = name;
  });
  // max
  cid += 1;
  config.load_max = val_priv;
  SetLegend(svg_root, obj_il, config.image.font, cid, config.max, '> ' + config.load_max);

  // weathermap arrows
  arrows = {};
  Object.keys(link_lines).forEach(function (name) {
    clink = link_lines[name];
    // pos calc
    clink.mid = PathAvg(clink.up, clink.down);
    clink.vec = PathVec(clink.up, clink.down);
    var len_arr = PathLen(clink.up, clink.down) / 2.0 - config.arrow.head;
    var cvec = clink.vec;
    var len_hw = config.arrow.width / 2.0;
    var len_hd = config.arrow.head;

    // down (from up end to mid)
    var elem_p = document.createElementNS(defSVG, 'path');
    var elem_cur = clink.up;
    var elem_str = PathStr('M', elem_cur);
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_hw, 1)));
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_arr, 0)));
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_hd - len_hw, 1)));
    PathAdd(elem_cur, PathAppVec(cvec, len_hd, 0));
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_hd, 3)));
    PathAdd(elem_cur, PathAppVec(cvec, len_hd, 2));
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_hd, 3)));
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_hd - len_hw, 1)));
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_arr, 2)));
    elem_str += 'Z';
    elem_p.setAttribute('d', elem_str);
    elem_p.setAttribute('stroke', 'blue');
    elem_p.setAttribute('stroke-width', 1);
    elem_p.setAttribute('id', name + '-down');
    elem_p.setAttribute('class', 'wm-cls0');
    var elem_pt = document.createElementNS(defSVG, 'title');
    elem_pt.setAttribute('id', name + '-down-tip');
    elem_p.appendChild(elem_pt);
    svg_root.appendChild(elem_p);
    arrows[name + '-down'] = {};
    if (clink.down.name !== undefined) {
      arrows[name + '-down']['name'] = clink.down.name;
    } else {
      arrows[name + '-down']['name'] = name + '-down';
    }
    // up (from down end to mid)
    var elem_p = document.createElementNS(defSVG, 'path');
    var elem_cur = clink.down;
    var elem_str = PathStr('M', elem_cur);
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_hw, 1)));
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_arr, 2)));
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_hd - len_hw, 1)));
    PathAdd(elem_cur, PathAppVec(cvec, len_hd, 2));
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_hd, 3)));
    PathAdd(elem_cur, PathAppVec(cvec, len_hd, 0));
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_hd, 3)));
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_hd - len_hw, 1)));
    elem_str += PathStr('L', PathAdd(elem_cur, PathAppVec(cvec, len_arr, 0)));
    elem_str += 'Z';
    elem_p.setAttribute('d', elem_str);
    elem_p.setAttribute('stroke', 'red');
    elem_p.setAttribute('stroke-width', 1);
    elem_p.setAttribute('id', name + '-up');
    elem_p.setAttribute('class', 'wm-cls0');
    var elem_pt = document.createElementNS(defSVG, 'title');
    elem_pt.setAttribute('id', name + '-up-tip');
    elem_p.appendChild(elem_pt);
    svg_root.appendChild(elem_p);
    arrows[name + '-up'] = {};
    if (clink.up.name !== undefined) {
      arrows[name + '-up']['name'] = clink.up.name;
    } else {
      arrows[name + '-up']['name'] = name + '-up';
    }
  });

  // constract weathermap history
  var svg_hist = document.getElementById('wmhistory');
  if (svg_hist === undefined) {
    console.log("weathermap history SVG element not found.");
    return;
  }
  // reset style to default (800,300)
  svg_hist.setAttribute("width", 800);
  svg_hist.setAttribute("height", 300);
  svg_hist.setAttribute("viewBox", "0 0 800 300");
  // reset style to defined in config.json
  document.getElementById("history_max").setAttribute("font-size", config.image.font + "px");
  document.getElementById("history_max").textContent = config.load_max;
  document.getElementById("history_min").setAttribute("font-size", config.image.font + "px");
  document.getElementById("history_unit").setAttribute("font-size", config.image.font + "px");
  document.getElementById("history_unit").textContent = config.unit;
  document.getElementById("history_start").setAttribute("font-size", config.image.font + "px");
  document.getElementById("history_end").setAttribute("font-size", config.image.font + "px");
  // legends
  var cid = 0;
  hist_color = {};
  Object.keys(arrows).forEach(function (dispid) {
    hist_color[dispid] = defHColor[cid];
    cid += 1;
    var elem_hleg = document.createElementNS(defSVG, 'text');
    elem_hleg.setAttribute("x", 710);
    elem_hleg.setAttribute("y", config.image.font * (1.0 + config.image.legend.sep) * cid);
    elem_hleg.textContent = dispid;
    elem_hleg.setAttribute("font-size", config.image.font + "px");
    elem_hleg.setAttribute("fill", hist_color[dispid]);
    svg_hist.appendChild(elem_hleg);
  });

  // start execution
  // set msec as 0 for saving length to localstorage
  curExecTime = new Date();
  curExecTime.setMilliseconds(0);
  curExecTime.setSeconds(curExecTime.getSeconds() + 1);
  if (config.data.url != '') {
    window.setTimeout(LoadDataInConfig, curExecTime - Date.now());
  }
  return;
};
function SetLegend(root, conf, font, id, color, text) {
  var elem_o_box = document.createElementNS(defSVG, 'rect');
  elem_o_box.setAttribute('x', conf.x + conf.r * 2);
  elem_o_box.setAttribute('y', conf.y + font * id * (1.0 + conf.sep) + conf.r * 2);
  elem_o_box.setAttribute('width', font * conf.bar_width);
  elem_o_box.setAttribute('height', font);
  elem_o_box.setAttribute('stroke', 'black');
  elem_o_box.setAttribute('stroke-width', 1);
  elem_o_box.setAttribute('fill', color);
  root.appendChild(elem_o_box);
  var elem_o_txt = document.createElementNS(defSVG, 'text');
  elem_o_txt.setAttribute('x', conf.x + conf.r * 2 + font * (conf.bar_width + 1));
  elem_o_txt.setAttribute('y', conf.y + conf.r * 2 + font * (id * (1.0 + conf.sep) + 1));
  elem_o_txt.textContent = text;
  elem_o_txt.setAttribute('font-size', font + 'px');
  root.appendChild(elem_o_txt);
};

function LoadDataInConfig() {
  var httpReq = new XMLHttpRequest();
  var json_data;
  console.log('LoadDataInConfig called: ' + Date.now());
  httpReq.open('GET', config.data.url, false);
  httpReq.send();
  if (httpReq.status === 200) {
    json_data = JSON.parse(httpReq.responseText);
    SetLoadData(json_data, curExecTime);
  } else {
    console.log('LoadDataInConfig load failed. End data acquisition loop.');
    return false;
  }

  curExecTime.setSeconds(curExecTime.getSeconds() + config.data.interval);
  if (config.data.url != '') {
    window.setTimeout(LoadDataInConfig, curExecTime - Date.now());
  }
}

// load this function for renewing data
// ld is in format of 'sample-data.json'
function SetLoadData(ld, update) {
  var dat_arrows = {};
  Object.keys(arrows).forEach(function (dispid) {
    var name = arrows[dispid]['name'];
    dat_arrows[dispid] = {};
    if (ld[name] !== undefined) {
      dat_arrows[dispid]['value'] = ld[name];
      dat_arrows[dispid]['color'] = GetColor(ld[name]);
    } else {
      dat_arrows[dispid]['value'] = 'na';
      dat_arrows[dispid]['color'] = config.na;
    }
    document.getElementById(dispid).setAttribute('fill', dat_arrows[dispid]['color']);
    document.getElementById(dispid + '-tip').innerHTML = dispid + ': ' + dat_arrows[dispid]['value'] + ' ' + config.unit;
  });
  var date;
  if (update !== undefined) {date = new Date(update); }
  else {date = new Date(); }
  document.getElementById('lastupdated').innerHTML = 'Last updated: ' + date.toLocaleString(config.image.locale);
  // for history, keep dat_arrows instead of ld, into IndexedDB
  var savedData;
  // debug use, uncomment this line to remove
  // XXX: need to have some code to do this from config
  // window.localStorage.removeItem(config.target.name);
  if (window.localStorage[config.target.name] !== undefined) {
    savedData = JSON.parse(window.localStorage[config.target.name]);
    savedData[Math.floor(date.getTime() / 1000)] = dat_arrows;
    // sort can work that date number is quite large without length changed
    if ((config.target.maxsave !== undefined) && (config.target.maxsave > 0)) {
      var deltarget = new Date();
      deltarget.setDate(deltarget.getDate() - config.target.maxsave);
      deltarget = Math.floor(deltarget.getTime() / 1000);
      Object.keys(savedData).sort().forEach(function (name) {
        if (name < deltarget) {delete savedData[name]; }
      });
    }
  } else {
    savedData = {};
    savedData[Math.floor(date.getTime() / 1000)] = dat_arrows;
  }
  window.localStorage[config.target.name] = JSON.stringify(savedData);
}
function GetColor(val) {
  var rcol = config.max;
  Object.keys(config.load).some(function (name) {
    if (val <= parseInt(name)) {rcol = config.load[name]; return true; }
  });
  return rcol;
}

function PathAdd(cur, add) {
  cur.x += add.x;
  cur.y += add.y;
  return cur;
}
function PathAvg(p0, p1) {
  return {'x': ((p0.x + p1.x) / 2.0), 'y': ((p0.y + p1.y) / 2.0)};
}
function PathVec(p0, p1) {
  var len = PathLen(p0, p1);
  return {'x': ((p1.x - p0.x) / len), 'y': ((p1.y - p0.y) / len)};
}
// rot = 0 orig, 1 90d, 2 180d, 3 270d
function PathAppVec(vec, len, rot) {
  var vec_x = vec.x;
  var vec_y = vec.y;
  if (rot == 1) {
    var tv = vec_x;
    vec_x = vec_y * -1;
    vec_y = tv;
  } else if (rot == 2) {
    vec_x *= -1;
    vec_y *= -1;
  } else if (rot == 3) {
    var tv = vec_x;
    vec_x = vec_y;
    vec_y = tv * -1;
  }
  return {'x': (len * vec_x), 'y': (len * vec_y)};
}
function PathLen(p0, p1) {
  return Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2));
}
function PathStr(str, pos) {
  return str + ' ' + pos.x + ' ' + pos.y + ' ';
};

