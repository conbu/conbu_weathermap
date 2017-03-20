// Policy:
//  do not rely on external library, incl jQuery etc.

var defConfig = { arrow : { width : 5, head : 10 }, image : { file: "", width : 0, height : 0 } };
var defConfigName = 'config.json';

var config;
var link_lines;

function LoadWeathermap() {
  // load config
  // this is base config, so use main thread but not sub.
  var httpReq = new XMLHttpRequest();
  httpReq.open('GET', defConfigName, false);
  httpReq.send();
  if (httpReq.status === 200) {
    json_load = JSON.parse(httpReq.responseText);
    config = defConfig;
    var json_conf = json_load.config;
    if (json_conf.arrow.width !== undefined) {config.arrow.width = json_conf.arrow.width; }
    if (json_conf.arrow.head !== undefined) {config.arrow.head = json_conf.arrow.head; }
    if (json_conf.image.file !== undefined) {config.image.file = json_conf.image.file; }
    if (json_conf.image.height !== undefined) {config.image.height = json_conf.image.height; }
    if (json_conf.image.width !== undefined) {config.image.width = json_conf.image.width; }
    if (json_load.link !== undefined) {link_lines = json_load.link; }
    else {
      console.log("No link defined in config json: " + defConfigName);
      return;
    }
  } else {
    console.log("Error to load configuration: " + defConfigName);
    return;
  }
  console.log("Configuration loaded successfully: " + defConfigName);

  // constract arrows
  var svg_root = document.getElementById('weathermap');
  svg_root.setAttribute("width", config.image.width);
  svg_root.setAttribute("height", config.image.height);
  svg_root.setAttribute("viewBox", "0 0 " + config.image.width + " " + config.image.height);
  var elem_img = document.createElementNS('http://www.w3.org/2000/svg','image');
  elem_img.setAttribute("x", 0);
  elem_img.setAttribute("y", 0);
  elem_img.setAttribute("height", config.image.height);
  elem_img.setAttribute("width", config.image.width);
  elem_img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', config.image.file);
  svg_root.appendChild(elem_img);

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
    var elem_p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
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
    svg_root.appendChild(elem_p);
    // up (from down end to mid)
    var elem_p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
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
    svg_root.appendChild(elem_p);
  });

  return;
};

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

