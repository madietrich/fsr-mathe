const map = "kdm";

var svg = document.getElementById(map);
var svgwidth = svg.parentElement.clientWidth;
svg.style.width = svgwidth+"px";

// arrow head: https://stackoverflow.com/a/52433340
// also, SVG doesn't support changing marker colours so we have to create one for each colour which freaking sucks
arrowColours = ["black","red","orange","blue"];
var arrowHeight = 4;
var arrowWidth = 5;
for(i = 0;i < arrowColours.length;i++){
	var arrow = document.createElementNS("http://www.w3.org/2000/svg","marker");
	arrow.setAttribute("id","head-"+arrowColours[i]);
	arrow.setAttribute("orient","auto-start-reverse");
	arrow.setAttribute("markerWidth",arrowWidth);
	arrow.setAttribute("markerHeight",arrowHeight);
	arrow.setAttribute("refX",0.1);
	arrow.setAttribute("refY",2);
	svg.appendChild(arrow);
	var arrowPath = document.createElementNS("http://www.w3.org/2000/svg","path");
	arrowPath.setAttribute("d","M0,0 V"+arrowHeight+" L"+arrowWidth+","+arrowHeight/2+" Z");
	arrowPath.style.fill = arrowColours[i];
	arrow.appendChild(arrowPath);
}

var xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
const viewBoxPad = 5;

var selected = null;

function lineEllipseIntersection(rx,ry,m){
	return Math.sqrt(rx*rx*ry*ry/(ry*ry+rx*rx*m*m));
}

function lineRectangleIntersection(hw,hh,m){
	return Math.min(hh/Math.abs(m),hw);
}

function lineNodeIntersection(node,m){
	var box = node.getBBox();
	if(node.tagName == "ellipse")
			return lineEllipseIntersection(
				box.width/2,
				box.height/2,
				m
			);
	if(node.tagName == "rect")
		return lineRectangleIntersection(
			box.width/2,
			box.height/2,
			m
		);
}

function slopePlusAngle(m,T){
	t = T*Math.PI/180;
	return (Math.sin(t)+m*Math.cos(t))/(Math.cos(t)-m*Math.sin(t));
}

// angle t is optional - if it is given, the path is calculated not as a straight line with slope m and length d but as a bezier curve with the first control point having a slope corresponding to m turned counterclockwise by t at a distance d/3 from the starting point and the second control point having a slope corresponding to m turned clockwise by t at a distance d/3 from the end point
function pathBetweenElements(node1,node2,arrow,angle,bidirectional,correction){
	if(leftOf(node1,node2)){
		var Node1 = node1;
		var Node2 = node2;
		var rightArrow = arrow&true;
		var leftArrow = bidirectional|false;
	}else{
		var Node1 = node2;
		var Node2 = node1;
		var leftArrow = arrow&true;
		var rightArrow = bidirectional|false;
	}
	Mx1 = Node1.getBBox().x+Node1.getBBox().width/2;
	My1 = Node1.getBBox().y+Node1.getBBox().height/2;
	Mx2 = Node2.getBBox().x+Node2.getBBox().width/2;
	My2 = Node2.getBBox().y+Node2.getBBox().height/2;
	if(correction){
		Mx1 += correction[0];
		My1 += correction[1];
		Mx2 += correction[2];
		My2 += correction[3];
	}
	var sw1 = +Node1.style.strokeWidth.slice(0,-2);
	var sw2 = +Node2.style.strokeWidth.slice(0,-2);
	var m = (My2-My1)/(Mx2-Mx1);
	if(angle){
		var m1 = slopePlusAngle(m,angle);
		var dx = lineNodeIntersection(Node1,m1);
		var x = Mx1+(1+m*m1>0?1:-1)*dx; // the factor (1+m*m1>0?1:-1) is the scalar product of (1,m) and (1,m1) which is positive if and only if c1x should be right of x
		var y = My1+m1*(1+m*m1>0?1:-1)*dx;
		var m2 = slopePlusAngle(m,-angle);
		dx = lineNodeIntersection(Node2,m2);
		var X = Mx2-(1+m*m2>0?1:-1)*dx;
		var Y = My2-m2*(1+m*m2>0?1:-1)*dx;
		var distance = Math.sqrt(Math.pow(Y-y,2)+Math.pow(X-x,2))/3;
		var c1x = x + (1+m*m1>0?1:-1)*distance/Math.sqrt(1+m1*m1);
		var c1y = y + m1*(1+m*m1>0?1:-1)*distance/Math.sqrt(1+m1*m1);
		x += (1+m*m1>0?1:-1)*(sw1/2)/Math.sqrt(1+m1*m1);
		y += m1*(1+m*m1>0?1:-1)*(sw1/2)/Math.sqrt(1+m1*m1);
		if(leftArrow){
			x += (1+m*m1>0?1:-1)*(2*arrowWidth)/Math.sqrt(1+m1*m1);
			y += m1*(1+m*m1>0?1:-1)*(2*arrowWidth)/Math.sqrt(1+m1*m1);
		}
		var c2x = X - (1+m*m2>0?1:-1)*distance/Math.sqrt(1+m2*m2);
		var c2y = Y - m2*(1+m*m2>0?1:-1)*distance/Math.sqrt(1+m2*m2);
		X -= (1+m*m2>0?1:-1)*(sw2/2)/Math.sqrt(1+m2*m2);
		Y -= m2*(1+m*m2>0?1:-1)*(sw2/2)/Math.sqrt(1+m2*m2);
		if(rightArrow){
			X -= (1+m*m2>0?1:-1)*(2*arrowWidth)/Math.sqrt(1+m2*m2);
			Y -= m2*(1+m*m2>0?1:-1)*(2*arrowWidth)/Math.sqrt(1+m2*m2);
		}
		return "M "+x+" "+y+" C "+c1x+" "+c1y+", "+c2x+" "+c2y+", "+X+" "+Y;
	}else{
		var dx = lineNodeIntersection(Node1,m);
		var x = Mx1+dx;
		var y = My1+m*dx;
		if(leftArrow){
			x += (2*arrowWidth)/Math.sqrt(1+m*m);
			y += m*(2*arrowWidth)/Math.sqrt(1+m*m);
		}
		dx = lineNodeIntersection(Node2,m);
		var X = Mx2-dx;
		var Y = My2-m*dx;
		if(rightArrow){
			X -= (2*arrowWidth)/Math.sqrt(1+m*m);
			Y -= m*(2*arrowWidth)/Math.sqrt(1+m*m);
		}else{
			x -= sw1/Math.sqrt(1+m*m);
			y -= m*sw1/Math.sqrt(1+m*m);
			X += sw2/Math.sqrt(1+m*m);
			Y += m*sw2/Math.sqrt(1+m*m);
		}
		return "M "+x+" "+y+" L "+X+" "+Y;
	}
}

function leftOf(node1,node2){
	b1 = node1.getBBox();
	b2 = node2.getBBox();
	return (b1.x+b1.width/2 < b2.x+b2.width/2);
}

function MapElement(name,x,y,nodeShape,style) {
	this.name = name;
	text = document.createElementNS("http://www.w3.org/2000/svg","text");
	text.setAttribute("x",x);
	text.setAttribute("y",y);
	for(prop in style.font)
		text.setAttribute(prop,style.font[prop]);
	text.setAttribute("text-anchor","middle");
	text.innerHTML = name;
	this.svgtext = svg.appendChild(text);
	for(prop in style.unselected.text)
		this.svgtext.style[prop] = style.unselected.text[prop];
	node = document.createElementNS("http://www.w3.org/2000/svg",nodeShape);
	this.svgnode = svg.insertBefore(node,text);
	this.resetAssociated = function() {
	}
	this.markAssociated = function() {
	}
	this.unselect = function() {
		for(prop in style.unselected.node)
			this.svgnode.style[prop] = style.unselected.node[prop];
		for(prop in style.unselected.text)
			this.svgtext.style[prop] = style.unselected.text[prop];
		this.resetAssociated();
		selected = null;
	};
	this.select = function() {
		if(selected)
			selected.unselect();
		for(prop in style.selected.node)
			this.svgnode.style[prop] = style.selected.node[prop];
		for(prop in style.selected.text)
			this.svgtext.style[prop] = style.selected.text[prop];
		selected = this;
		this.markAssociated();
	};
	this.toggle = function() {
		if(selected == this)
			this.unselect();
		else
			this.select();
	}
	this.unselect.bind(this)();
	this.svgnode.addEventListener("click",this.toggle.bind(this));
	this.svgtext.addEventListener("click",this.toggle.bind(this));
	this.updateViewBox = function() {
		xmin = Math.min(xmin,this.svgnode.getBBox().x);
		ymin = Math.min(ymin,this.svgnode.getBBox().y);
		xmax = Math.max(xmax,this.svgnode.getBBox().x+this.svgnode.getBBox().width);
		ymax = Math.max(ymax,this.svgnode.getBBox().y+this.svgnode.getBBox().height);
	}
}

function Field(name,x,y) {
	this.style = {
		unselected: {
			node: {
				fill: "#003560",
				stroke: "black",
				strokeWidth: 2
			},
			text: {
				fill: "white"
			}
		},
		selected: {
			node: {
				fill: "#7f9aaf",
				stroke: "green",
				strokeWidth: 2
			},
			text: {
				fill: "white"
			}
		},
		lectureBelongingToField: {
			node: {
				fill: "white",
				stroke: "red",
				strokeWidth: 2
			},
			text: {
				fill: "black"
			},
			edge: {
				unselected: "black",
				selected: "red",
				strokeWidth: 2
			}
		},
		font: {
			"font-family": "Open Sans",
			"font-size": 12
		}
	};
	var pad = 5;
	MapElement.call(this,name,x,y,"ellipse",this.style);
	this.associated = [];
	box = this.svgtext.getBBox();
	this.svgnode.setAttribute("cx",box.x+box.width/2);
	this.svgnode.setAttribute("cy",box.y+box.height/2);
	this.svgnode.setAttribute("rx",.5*Math.SQRT2*box.width+pad);
	this.svgnode.setAttribute("ry",.5*Math.SQRT2*box.height+pad);
	this.updateViewBox();
	this.associate = function (lecture,angle,correction) {
		var path = document.createElementNS("http://www.w3.org/2000/svg","path");
		path.setAttribute("d",pathBetweenElements(this.svgnode,lecture.svgnode,false,angle,false,correction));
		svg.insertBefore(path,svg.firstChild);
		path.style.stroke = this.style.lectureBelongingToField.edge.unselected;
		path.style.strokeWidth = this.style.lectureBelongingToField.edge.strokeWidth;
		path.style.fill = "none";
		association = {
			node: lecture,
			path: path
		};
		lecture.associated.belongingTo.push({
			node: this,
			path: path
		});
		this.associated.push(association);
	}
	this.markAssociated = function() {
		for(i = 0; i < this.associated.length; i++){
			lecture = this.associated[i]["node"];
			path = this.associated[i]["path"];
			for(prop in this.style.lectureBelongingToField.node)
				lecture.svgnode.style[prop] = this.style.lectureBelongingToField.node[prop];
			for(prop in this.style.lectureBelongingToField.text)
				lecture.svgtext.style[prop] = this.style.lectureBelongingToField.text[prop];
			path.style.stroke = this.style.lectureBelongingToField.edge.selected;
			}
	}
	this.resetAssociated = function() {
		for(i = 0; i < this.associated.length; i++){
			lecture = this.associated[i]["node"];
			path = this.associated[i]["path"];
			for(prop in this.style.lectureBelongingToField.node)
				lecture.svgnode.style[prop] = lecture.style.unselected.node[prop];
			for(prop in this.style.lectureBelongingToField.text)
				lecture.svgtext.style[prop] = lecture.style.unselected.text[prop];
			path.style.stroke = this.style.lectureBelongingToField.edge.unselected;
		}
	}
}

function setNodeDimensions(node,x,y,box,pad){
	if(node.tagName == "ellipse"){
		node.setAttribute("cx",box.x+box.width/2);
		node.setAttribute("cy",box.y+box.height/2);
		node.setAttribute("rx",.5*Math.SQRT2*box.width+pad);
		node.setAttribute("ry",.5*Math.SQRT2*box.height+pad);
	}
	if(node.tagName == "rect"){
		node.setAttribute("x",box.x-pad);
		node.setAttribute("y",box.y-pad);
		node.setAttribute("width",box.width+2*pad);
		node.setAttribute("height",box.height+2*pad);
	}
}

var visited = [];

function Lecture(name,x,y,nodeShape) {
	this.style = {
		unselected: {
			node: {
				fill: "white",
				stroke: "black",
				strokeWidth: 2
			},
			text: {
				fill: "black"
			},
		},
		selected: {
			node: {
				fill: "#d0d0d0",
				stroke: "green",
				strokeWidth: 2
			},
			text: {
				fill: "black"
			},
		},
		requiredBy: {
			node: {
				fill: "white",
				stroke: "red",
				strokeWidth: 2
			},
			text: {
				fill: "black"
			},
			edge: {
				unselected: "black",
				selected: "red",
				strokeWidth: 2,
				strokeDasharray: "1,5"
			}
		},
		requires: {
			node: {
				fill: "white",
				stroke: "orange",
				strokeWidth: 2
			},
			text: {
				fill: "black"
			},
			edge: {
				unselected: "black",
				selected: "orange",
				strokeWidth: 2,
				strokeDasharray: "1,5"
			}
		},
		bidirectionalRequirements: {
			node: {
				fill: "white",
				stroke: "blue",
				strokeWidth: 2
			},
			text: {
				fill: "black"
			},
			edge: {
				unselected: "black",
				selected: "blue",
				strokeWidth: 2,
				strokeDasharray: "1,5"
			}
		},
		belongingTo: {
			node: {
				fill: "#7f9aaf",
				stroke: "orange",
				strokeWidth: 2
			},
			text: {
				fill: "black"
			},
			edge: {
				unselected: "black",
				selected: "orange",
				strokeWidth: 2,
				strokeDasharray: "1,5"
			}
		},
		font: {
			"font-family": "Open Sans",
			"font-size": 12
		}
	};
	var pad = 5;
	MapElement.call(this,name,x,y,nodeShape,this.style);
	this.associated = {
		requires: [],
		requiredBy: [],
		belongingTo: []
	}
	box = this.svgtext.getBBox();
	setNodeDimensions(this.svgnode,x,y,box,pad);
	this.updateViewBox();
	this.associate = function (lecture,dashed,bidirectional,angle,correction) {
		var path = document.createElementNS("http://www.w3.org/2000/svg","path");
		path.setAttribute("d",pathBetweenElements(this.svgnode,lecture.svgnode,true,angle,bidirectional,correction));
		var leftArrow = leftOf(this.svgnode,lecture.svgnode)|bidirectional;
		var rightArrow = (!leftOf(this.svgnode,lecture.svgnode))|bidirectional;
		if(leftArrow)
			path.setAttribute("marker-end","url(#head-"+this.style.requiredBy.edge.unselected+")");
		if(rightArrow)
			path.setAttribute("marker-start","url(#head-"+this.style.requiredBy.edge.unselected+")");
		svg.insertBefore(path,svg.firstChild);
		path.style.stroke = this.style.requiredBy.edge.unselected;
		path.style.strokeWidth = this.style.requiredBy.edge.strokeWidth;
		path.style.fill = "none";
		if(dashed)
			path.style.strokeDasharray = this.style.requiredBy.edge.strokeDasharray;
		association = {
			node: lecture,
			path: path
		};
		lecture.associated.requires.push({
			node: this,
			path: path,
			bidirectional: bidirectional
		});
		this.associated.requiredBy.push(association);
		if(bidirectional)
			this.associated.requires.push({
				node: lecture,
				path: path,
				bidirectional: bidirectional
			});
	}
	this.markRequirements = function(){
		if(!visited.includes(this)){
			visited.push(this);
			for(i = 0; i < this.associated.belongingTo.length; i++){
				field = this.associated.belongingTo[i]["node"];
				path = this.associated.belongingTo[i]["path"];
				for(prop in this.style.belongingTo.node)
					field.svgnode.style[prop] = this.style.belongingTo.node[prop];
				for(prop in this.style.belongingTo.text)
					field.svgtext.style[prop] = this.style.belongingTo.text[prop];
				path.style.stroke = this.style.belongingTo.edge.selected;
			}
			for(i = 0; i < this.associated.requires.length; i++){
				lecture = this.associated.requires[i]["node"];
				path = this.associated.requires[i]["path"];
				if(this.associated.requires[i]["bidirectional"])
					reqStyle = this.style.bidirectionalRequirements;
				else
					reqStyle = this.style.requires;
				if(!visited.includes(lecture)){
					for(prop in reqStyle.node)
						lecture.svgnode.style[prop] = reqStyle.node[prop];
					for(prop in reqStyle.text)
						lecture.svgtext.style[prop] = reqStyle.text[prop];
				}
				if(path.hasAttribute("marker-end"))
					path.setAttribute("marker-end",
						"url(#head-"+reqStyle.edge.selected+")"
					);
				if(path.hasAttribute("marker-start"))
					path.setAttribute("marker-start",
					"url(#head-"+reqStyle.edge.selected+")"
				);
			path.style.stroke = reqStyle.edge.selected;
				lecture.markRequirements();
			}
		}
	}
	this.markAssociated = function() {
		for(i = 0; i < this.associated.requiredBy.length; i++){
			lecture = this.associated.requiredBy[i]["node"];
			path = this.associated.requiredBy[i]["path"];
			for(prop in this.style.requiredBy.node)
				lecture.svgnode.style[prop] = this.style.requiredBy.node[prop];
			for(prop in this.style.requiredBy.text)
				lecture.svgtext.style[prop] = this.style.requiredBy.text[prop];
			if(path.hasAttribute("marker-end"))
				path.setAttribute("marker-end",
					"url(#head-"+this.style.requiredBy.edge.selected+")"
				);
		if(path.hasAttribute("marker-start"))
			path.setAttribute("marker-start",
				"url(#head-"+this.style.requiredBy.edge.selected+")"
			);
			path.style.stroke = this.style.requiredBy.edge.selected;
		}
		visited = [];
		this.markRequirements();
	}
	this.resetRequirements = function() {
		if(!visited.includes(this)){
			visited.push(this);
			for(i = 0; i < this.associated.belongingTo.length; i++){
				field = this.associated.belongingTo[i]["node"];
				path = this.associated.belongingTo[i]["path"];
				for(prop in field.style.unselected.node)
					field.svgnode.style[prop] = field.style.unselected.node[prop];
				for(prop in field.style.unselected.text)
					field.svgtext.style[prop] = field.style.unselected.text[prop];
				path.style.stroke = this.style.belongingTo.edge.unselected;
			}
			for(i = 0; i < this.associated.requires.length; i++){
				lecture = this.associated.requires[i]["node"];
				path = this.associated.requires[i]["path"];
				if(this.associated.requires[i]["bidirectional"])
					reqStyle = this.style.bidirectionalRequirements;
				else
					reqStyle = this.style.requires;
				for(prop in lecture.style.unselected.node)
					lecture.svgnode.style[prop] = lecture.style.unselected.node[prop];
				for(prop in lecture.style.unselected.text)
					lecture.svgtext.style[prop] = lecture.style.unselected.text[prop];
					if(path.hasAttribute("marker-end"))
						path.setAttribute("marker-end",
							"url(#head-"+reqStyle.edge.unselected+")"
						);
				if(path.hasAttribute("marker-start"))
						path.setAttribute("marker-start",
							"url(#head-"+reqStyle.edge.unselected+")"
						);
				path.style.stroke = reqStyle.edge.unselected;
				lecture.resetRequirements();
			}
		}
	}
	this.resetAssociated = function() {
		for(i = 0; i < this.associated.requiredBy.length; i++){
			lecture = this.associated.requiredBy[i]["node"];
			path = this.associated.requiredBy[i]["path"];
			for(prop in lecture.style.unselected.node)
				lecture.svgnode.style[prop] = lecture.style.unselected.node[prop];
			for(prop in lecture.style.unselected.text)
				lecture.svgtext.style[prop] = lecture.style.unselected.text[prop];
			if(path.hasAttribute("marker-end"))
				path.setAttribute("marker-end",
					"url(#head-"+this.style.requiredBy.edge.unselected+")"
				);
			if(path.hasAttribute("marker-start"))
				path.setAttribute("marker-start",
					"url(#head-"+this.style.requiredBy.edge.unselected+")"
				);
			path.style.stroke = this.style.requiredBy.edge.unselected;
		}
		visited = [];
		this.resetRequirements();
	}
}

function Regular(name,x,y) {
	Lecture.call(this,name,x,y,"rect");
}

function Irregular(name,x,y) {
	Lecture.call(this,name,x,y,"ellipse");
}

svg.setAttribute("viewBox","-1 -1 0 0");

var fields = {
	Algebra: new Field("Algebra",38.665001,-298.229000),
	Geometrie: new Field("Geometrie",89.201698,-49.691601),
	Analysis: new Field("Analysis",235.451000,241.098010),
	Informatik: new Field("Informatik",-411.161010,-368.549990),
	Numerik: new Field("Numerik",488.289000,634.234990),
	Stochastik: new Field("Stochastik",-312.103000,55.188400)
}

var regular = {
	Algebra1: new Regular("Algebra 1",139.481000,-324.178000),
	Zahlentheorie: new Regular("Zahlentheorie",-121.074150,-418.365000),
	Topologie: new Regular("Topologie",198.478000,-139.515000),
	Komplexitätstheorie: new Regular("Komplexitätstheorie",-49.934750,-348.292000),
	Kryptographie: new Regular("Kryptographie",-312.047000,-200.102000),
	DiMa: new Regular("Diskrete Mathematik 1",-207.449000,-356.238000),
	algTopo: new Regular("Algebraische Topologie",534.595000,-187.006000),
	Differentialgeometrie: new Regular("Differentialgeometrie",202.256000,-2.440000),
	DynSym: new Regular("Dynamische Systeme",150.580200,143.608000),
	Ana3: new Regular("Analysis 3",90.138000,58.691000),
	Funktionentheorie: new Regular("Funktionentheorie",552.613000,181.344000),
	Funktionalanalysis: new Regular("Funktionalanalysis",48.817200,342.297000),
	KuF: new Regular("Kurven und Flächen",291.222000,101.966900),
	gDGL: new Regular("gewöhnliche Differentialgleichungen",363.058000,181.909000),
	pDGL: new Regular("partielle Differentialgleichungen",194.495800,298.271000),
	EWS: new Regular("Einführung in die Wahrscheinlichkeitstheorie und Statistik",-122.616900,-1.093400),
	Numerik2: new Regular("Numerische Verfahren partieller Differentialgleichungen",153.400060,540.875000),
	WTheo: new Regular("Wahrscheinlichkeitstheorie 1",-190.187000,268.453000),
	Numerik1: new Regular("Numerische Verfahren gewöhnlicher Differentialgleichungen",429.221000,409.287000),
	TI: new Regular("Theoretische Informatik",-298.148000,-427.764000),
	Datenstrukturen: new Regular("Datenstrukturen",-490.307000,-539.559000),
	Datenbanksysteme: new Regular("Datenbanksysteme",-693.472000,-471.462000),
	Effi: new Regular("Effiziente Algorithmen",-560.035000,-746.159000),
	DiMa2: new Regular("Diskrete Mathematik 2",-234.949000,-606.868000),
	ENum: new Regular("Einführung in die Numerik",544.927000,528.563000),
	Statistik: new Regular("Statistik 1",-256.807000,118.152000),
	WTheo2: new Regular("Wahrscheinlichkeitstheorie 2",-445.344000,444.545000),
	Statistik2: new Regular("Statistik 2",-321.796000,312.358000)
}

var irregular = {
	Darstellungstheorie: new Irregular("Darstellungstheorie",262.315000,-352.399990),
	algZT: new Irregular("Algebraische Zahlentheorie",53.669300,-522.531980),
	homAlg: new Irregular("Homologische Algebra",340.565000,-449.493010),
	komAlg: new Irregular("Kommutative Algebra",439.419010,-312.881010),
	AlgGeo: new Irregular("Algebraische Geometrie",416.334010,-237.585010),
	LieAlg: new Irregular("Lie Algebren",258.993990,-516.310970),
	kombAlg: new Irregular("Kombinatorische Algebra",-30.807301,-200.383000),
	Transformationsgruppen: new Irregular("Transformationsgruppen",379.949010,-45.158699),
	AlgGrp: new Irregular("Algebraische Gruppen",547.534000,-439.274990),
	Bool: new Irregular("Boolesche Funktionen",-339.449010,-554.056030),
	Differentialtopologie: new Irregular("Differentialtopologie",318.109990,-95.479301),
	Symp: new Irregular("Symplektische Geometrie",379.795010,25.509701),
	Homotopietheorie: new Irregular("Homotopietheorie",762.474000,-230.485990),
	CGeo: new Irregular("Komplexe Geometrie",581.966000,-47.685501),
	KonGeo: new Irregular("Konvexgeometrie",-3.446010,145.228000),
	Approximationstheorie: new Irregular("Approximationstheorie",317.743990,496.095000),
	Quantenalgorithmen: new Irregular("Quantenalgorithmen",-594.892030,-245.114000),
	ProbAlgo: new Irregular("Probabilistische Algorithmen",-317.742000,-106.387000),
	Maschlern: new Irregular("Maschinelles Lernen",-129.213000,-150.419010),
	DL: new Irregular("Deep Learning",-504.631010,-69.192200),
	SymKryp: new Irregular("Symmetrische Kryptanalyse",-602.513000,-333.501010),
	Kryptanalyse: new Irregular("Kryptanalyse",-637.530030,-70.409203),
	KryPo: new Irregular("Kryptographische Protokolle",-636.517030,-151.258000),
	Adaptivität: new Irregular("Adaptivität",316.106000,651.060970),
	Optimierung: new Irregular("Optimierung",715.554990,661.731020),
	Erhaltungsgleichungen: new Irregular("Erhaltungsgleichungen",45.075001,747.963990),
	NumStrö: new Irregular("Numerische Strömungsmechanik",324.135010,745.096980),
	HoherDim: new Irregular("Hoch Dimensionale Statistik",-447.001010,219.590000),
	BB: new Irregular("Brownsche Bewegung",-435.388000,268.316990),
	StochAna: new Irregular("Stochastische Analysis",-110.034000,497.493990),
	StochMod: new Irregular("Stochastische Modelle",-305.360990,488.553010),
	StatMech: new Irregular("Statistische Mechanik",-478.342010,392.256990),
	StochGeo: new Irregular("Stochastische Geometrie",-119.543000,336.226010)
}

fields["Algebra"].associate(regular["Algebra1"]);
fields["Algebra"].associate(regular["Zahlentheorie"],-45);
fields["Analysis"].associate(regular["Ana3"],-50);
fields["Analysis"].associate(regular["Funktionentheorie"],5);
fields["Analysis"].associate(regular["Funktionalanalysis"],-30);
fields["Analysis"].associate(regular["KuF"],-15);
fields["Informatik"].associate(regular["TI"]);
fields["Informatik"].associate(regular["Datenstrukturen"]);
fields["Informatik"].associate(regular["Datenbanksysteme"]);
fields["Informatik"].associate(irregular["Bool"]);
fields["Informatik"].associate(regular["Kryptographie"]);
fields["Informatik"].associate(irregular["Quantenalgorithmen"]);
fields["Informatik"].associate(irregular["ProbAlgo"],15);
fields["Numerik"].associate(regular["ENum"]);
fields["Numerik"].associate(regular["Numerik1"],5);
fields["Numerik"].associate(irregular["Adaptivität"]);
fields["Stochastik"].associate(regular["EWS"]);
fields["Geometrie"].associate(regular["Topologie"]);
fields["Geometrie"].associate(irregular["Symp"],-15);
fields["Geometrie"].associate(regular["KuF"],25);
fields["Geometrie"].associate(regular["DynSym"],-10);
fields["Geometrie"].associate(irregular["KonGeo"]);

regular["Algebra1"].associate(irregular["Darstellungstheorie"],false);
regular["Algebra1"].associate(irregular["algZT"],false);
regular["Algebra1"].associate(regular["Topologie"],true);
regular["Algebra1"].associate(irregular["homAlg"],false,false,-15);
regular["Algebra1"].associate(irregular["komAlg"],false);
regular["Algebra1"].associate(irregular["AlgGeo"],false);
regular["Algebra1"].associate(irregular["LieAlg"],false);
regular["Algebra1"].associate(irregular["kombAlg"],false);
regular["Algebra1"].associate(regular["Komplexitätstheorie"],true);
regular["Zahlentheorie"].associate(irregular["algZT"],false);
regular["Zahlentheorie"].associate(irregular["Bool"],true);
regular["Zahlentheorie"].associate(regular["Kryptographie"],true,false,40);
regular["Zahlentheorie"].associate(regular["DiMa"],true);
regular["Topologie"].associate(regular["algTopo"],false);
regular["Topologie"].associate(irregular["Differentialtopologie"],true);
regular["Topologie"].associate(regular["Differentialgeometrie"],true);
regular["Topologie"].associate(irregular["AlgGeo"],true);
regular["Topologie"].associate(regular["DynSym"],true,false,-32.5);
regular["Topologie"].associate(irregular["Symp"],true,false,25);
regular["algTopo"].associate(irregular["Homotopietheorie"],false);
regular["algTopo"].associate(irregular["Symp"],true,false,32);
regular["Differentialgeometrie"].associate(regular["DynSym"],true);
regular["Differentialgeometrie"].associate(irregular["Symp"],true);
regular["Ana3"].associate(regular["Topologie"],true);
regular["Ana3"].associate(irregular["Differentialtopologie"],false,false,-30);
regular["Ana3"].associate(regular["Differentialgeometrie"],false);
regular["Ana3"].associate(irregular["Transformationsgruppen"],false,false,12.5);
regular["Ana3"].associate(regular["KuF"],true);
regular["Ana3"].associate(regular["gDGL"],true);
regular["Ana3"].associate(regular["pDGL"],false,false,45);
regular["Ana3"].associate(irregular["Symp"],false);
regular["Ana3"].associate(regular["EWS"],true);
regular["Ana3"].associate(irregular["KonGeo"],true);
regular["Funktionentheorie"].associate(irregular["CGeo"],false);
regular["Funktionalanalysis"].associate(regular["DynSym"],true);
regular["Funktionalanalysis"].associate(regular["pDGL"],true);
regular["Funktionalanalysis"].associate(regular["Numerik2"],true);
regular["Funktionalanalysis"].associate(irregular["Approximationstheorie"],true);
regular["Funktionalanalysis"].associate(regular["WTheo"],true);
regular["KuF"].associate(regular["Differentialgeometrie"],true);
regular["DynSym"].associate(irregular["Symp"],true,false,-15);
regular["gDGL"].associate(irregular["Transformationsgruppen"],true,false,80);
regular["gDGL"].associate(regular["DynSym"],true);
regular["gDGL"].associate(regular["pDGL"],false,false,10);
regular["gDGL"].associate(irregular["Symp"],true);
regular["gDGL"].associate(regular["Numerik1"],true);
regular["pDGL"].associate(regular["Numerik2"],true);
regular["TI"].associate(irregular["Maschlern"],true,false,37.5);
regular["TI"].associate(regular["Komplexitätstheorie"],false);
regular["Datenstrukturen"].associate(regular["TI"],true);
regular["Datenstrukturen"].associate(regular["Datenbanksysteme"],true);
regular["Datenstrukturen"].associate(regular["Effi"],false);
regular["Komplexitätstheorie"].associate(irregular["Maschlern"],true,false,-37.5);
regular["Kryptographie"].associate(irregular["Kryptanalyse"],true);
regular["Kryptographie"].associate(irregular["KryPo"],false,false);
regular["Kryptographie"].associate(irregular["Quantenalgorithmen"],true);
regular["Kryptographie"].associate(irregular["SymKryp"],true);
regular["DiMa"].associate(irregular["kombAlg"],true);
regular["DiMa"].associate(regular["TI"],true);
regular["DiMa"].associate(regular["Kryptographie"],true);
regular["DiMa"].associate(regular["DiMa2"],false);
regular["DiMa2"].associate(regular["TI"],true,false,15);
regular["ENum"].associate(regular["Numerik1"],false);
regular["ENum"].associate(irregular["Approximationstheorie"],false);
regular["ENum"].associate(irregular["Optimierung"],false);
regular["Numerik1"].associate(regular["Numerik2"],false,false,-15);
regular["Numerik2"].associate(irregular["Erhaltungsgleichungen"],false);
regular["Numerik2"].associate(irregular["Adaptivität"],false);
regular["Numerik2"].associate(irregular["NumStrö"],false);
regular["EWS"].associate(irregular["kombAlg"],true,false,30);
regular["EWS"].associate(irregular["Maschlern"],false);
regular["EWS"].associate(regular["Kryptographie"],true,false,-15);
regular["EWS"].associate(irregular["ProbAlgo"],true);
regular["EWS"].associate(regular["WTheo"],false);
regular["EWS"].associate(regular["Statistik"],false);
regular["WTheo"].associate(irregular["HoherDim"],true);
regular["WTheo"].associate(regular["WTheo2"],false);
regular["WTheo"].associate(regular["Statistik"],true);
regular["WTheo"].associate(regular["Statistik2"],false);
regular["WTheo"].associate(irregular["BB"],false);
regular["WTheo"].associate(irregular["StochAna"],false,false,60);
regular["WTheo"].associate(irregular["StochMod"],false,false,-10);
regular["WTheo"].associate(irregular["StatMech"],false,false,22.5);
regular["WTheo"].associate(irregular["StochGeo"],false);
regular["WTheo2"].associate(irregular["StatMech"],true);
regular["Statistik"].associate(irregular["Maschlern"],true,false);
regular["Statistik"].associate(irregular["HoherDim"],false);
regular["Statistik"].associate(regular["Statistik2"],false);
regular["Statistik"].associate(irregular["BB"],true,false,30);
irregular["Darstellungstheorie"].associate(irregular["Transformationsgruppen"],true,false,-60);
irregular["Darstellungstheorie"].associate(irregular["AlgGrp"],true);
irregular["Differentialtopologie"].associate(regular["Differentialgeometrie"],true);
irregular["Differentialtopologie"].associate(irregular["Symp"],true,false,-30);
irregular["homAlg"].associate(regular["algTopo"],true,false,-37.5,[0,0,30,0]);
irregular["komAlg"].associate(regular["algTopo"],true,false,-30);
irregular["komAlg"].associate(irregular["Differentialtopologie"],true,false,-52.5);
irregular["komAlg"].associate(irregular["AlgGeo"],false);
irregular["AlgGeo"].associate(irregular["AlgGrp"],false,false,45);
irregular["AlgGeo"].associate(irregular["CGeo"],true,false,15);
irregular["LieAlg"].associate(irregular["Darstellungstheorie"],true,false,30);
irregular["LieAlg"].associate(irregular["AlgGrp"],true);
irregular["CGeo"].associate(irregular["Symp"],true);
irregular["Maschlern"].associate(irregular["DL"],false,false,30);
irregular["Bool"].associate(irregular["SymKryp"],true);
irregular["KonGeo"].associate(irregular["StochGeo"],true);

svg.setAttribute("viewBox",(xmin-viewBoxPad)+" "+(ymin-viewBoxPad)+" "+((xmax-xmin)+2*viewBoxPad)+" "+((ymax-ymin)+2*viewBoxPad));

var resizeSVG = function() {
	svgwidth = svg.parentElement.clientWidth;
	var svgheight = ((ymax-ymin+2*viewBoxPad)/(xmax-xmin+2*viewBoxPad))*svgwidth;
	svg.style.width = svgwidth+"px";
	svg.style.height = svgheight+"px";
}

resizeSVG();

// since onresize also fires on zoom events,this would prevent the user from zooming so we're not doing this
//window.addEventListener('resize',resizeSVG);
