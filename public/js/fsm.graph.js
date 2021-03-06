﻿/*
* fsm.graph.js
* Graph module for fsm
*/
/*jslint browser : true, continue : true,
devel : true, indent : 2, maxerr : 50,
newcap : true, nomen : true, plusplus : true,
regexp : true, sloppy : true, vars : false,
white : true
*/
/*global $, fsm */
fsm.graph = (function() {
    //---------------- BEGIN MODULE SCOPE VARIABLES --------------
    var
        // Private members
        configMap = {
            anchor_schema_map: {

            },
            main_html: String()
                + '<div id="fsm-graph-print">'
                    + '<img id="fsm-graph-img"/>'
                + '</div>'
                + '<div id="fsm-graph-container">'
                    + '<canvas id="fsm-graph" width="" height=""></canvas>'
                    + '<canvas id="fsm-graph-copy" width="", height=""></canvas>'
                + '</div>',
            settingsMap: {
                guide_wires: true,
                grid: true,
                blinkingInterval: true,
                BLINK_ON: true,
                BLINK_OFF: true,
                debug: true,
                font: true,
                updateIntervalMax: false
            }
        },
        settingsMap = {
            guide_wires: true,
            grid: true,
            blinkingInterval: null,
            BLINK_ON: 1000,
            BLINK_OFF: 500,
            debug: true,
            font: 'normal bold 1.5em ariel',
            updateIntervalMax: 200,
            width: 2000,
            height: 1000
        },
        stateMap = {
            $container: null,
            anchor_map: {},
            mouseXpos: null,
            mouseYpos: null,
            mouseDown: {},
            dragging: false,
            transitionStart: null,
            draggingOffsetX: {},
            draggingOffsetY: {},
            drawingSurfaceImageData: null,
            states: [],
            rubberbandRect: {},
            isEditingText: false,
            selectedObject: null,
            hasFocus: false,
            graph: null,
            img: null,
            timeElapsed: 0,
            zoomLevel: 1,
            navMoved: false
        },
        jqueryMap = {},
        patternMap = {
            lambda: /(\/lambda)/gi,
            epsilon: /(\/epsilon)/gi,
            delta: /(\/delta)/gi
        },
        specialCharMap = {
            lambda: '&lambda;',
            epsilon: '&epsilon;',
            delta: '&delta;'
        },
        canvas, context, loc, cursor, line, fontHeight, copyAnchorMap,
        setJqueryMap, changeAnchorPart, drawCircle, drawPolygons, drawPolygon,
        drawGrid, drawToPoint, updateRubberbandRectangle, drawRubberbandShape,
        saveDrawingSurface, restoreDrawingSurface, updateRubberband, windowToCanvas,
        drawHorizontalLine, drawVerticalLine, drawGuidewires, startDragging, drawState,
        drawTransition, drawTransitions, drawStates, setSelectedObject, unselectObject,
        moveCursor, blinkCursor, setText, resetContext, deleteObject, drawParallelLine,
        drawNormalLine, drawIntersectionPoint, getDistance, findStateAtPosition, Circle,
        Shape, Point, Polygon, State, Transition, TextLine, TextCursor, Vector, onClick,
        onDoubleClick, onMouseDown, onMouseUp, onMouseMove, onInputChange, onGraphLoad, onScroll,
        onGraphPrint, onKeyDown, onKeyPress, onZoomOut, onZoomIn, onExport,
        initModule, getStates, captureCanvas, resizeCanvas;
    //----------------- END MODULE SCOPE VARIABLES ---------------

    //----------------- BEGIN OBJECT CONSTRUCTORS ----------------

    // Begin Object Constructor /Shape/
    Shape = function() {
        this.x = undefined;
        this.y = undefined;
        this.strokeStyle = 'rgba(255, 253, 208, 0.9)';
        this.fillStyle = 'rgba(147, 197, 114, 0.8)';
    };
    // End Object Constructor /Shape/

    // Begin Object Prototype /Shape.prototype/
    Shape.prototype = {
        // Collision detection methods.....................................
        collidesWith: function(shape) {
            var axes = this.getAxes().concat(shape.getAxes());
            return !this.separationOnAxes(axes, shape);
        },
        separationOnAxes: function(axes, shape) {
            for (var i = 0; i < axes.length; ++i) {
                axis = axes[i];
                projection1 = shape.project(axis);
                projection2 = this.project(axis);
                if (! projection1.overlaps(projection2)) {
                    return true; // Don't have to test remaining axes
                }
            }
            return false;
        },
        project: function(axis) {
            throw 'project(axis) not implemented';
        },
        getAxes: function() {
            throw 'getAxes() not implemented';
        },
        move: function(dx, dy) {
            throw 'move(dx, dy) not implemented';
        },
        // Drawing methods.................................................
        createPath: function(context) {
            throw 'createPath(context) not implemented';
        },
        fill: function(context) {
            context.save();
            context.fillStyle = this.fillStyle;
            this.createPath(context);
            context.fill();
            context.restore();
        },
        stroke: function(context) {
            context.save();
            context.strokeStyle = this.strokeStyle;
            this.createPath(context);
            context.stroke();
            context.restore();
        },
        isPointInPath: function(context, x, y) {
            this.createPath(context);
            return context.isPointInPath(x, y);
        },
        setText: function(context) {
            throw 'setText(context) not implemented';
        }
    };
    // End Object Prototype /Shape.prototype/

    // Begin Object Constructor /Point/
    Point = function(x, y) {
        this.x = x;
        this.y = y;
    };
    // End Object Prototype /Point/

    // Begin Object Constructor /Circle/
    Circle = function(centerX, centerY, radius, strokeStyle, fillStyle, filled) {
        this.x = centerX;
        this.y = centerY;
        this.radius = radius;
        this.strokeStyle = strokeStyle;
        this.fillStyle = fillStyle;
        this.filled = filled;
    };
    // End Object Constructor /Circle/

    // Begin Object Prototype /Circle.prototype/
    Circle.prototype = new Shape();

    Circle.prototype.collidesWith = function(shape) {
        var point,
            length,
            min = 10000,
            v1,
            v2,
            edge,
            perpendicular,
            normal,
            axes = shape.getAxes(),
            distance;
        if (axes === undefined) { // Circle
            distance = Math.sqrt(Math.pow(shape.x - this.x, 2) +
                Math.pow(shape.y - this.y, 2));
            return distance < Math.abs(this.radius + shape.radius);
        } else { // Polygon
            return polygonCollidesWithCircle(shape, this);
        }
    };
    Circle.prototype.getAxes = function() {
        return undefined; // Circles have an infinite number of axes
    };
    Circle.prototype.project = function(axis) {
        var scalars = [],
            point = new Point(this.x, this.y);
        dotProduct = new Vector(point).dotProduct(axis);
        scalars.push(dotProduct);
        scalars.push(dotProduct + this.radius);
        scalars.push(dotProduct - this.radius);
        return new Projection(Math.min.apply(Math, scalars),
            Math.max.apply(Math, scalars));
    };
    Circle.prototype.move = function(dx, dy) {
        this.x += dx;
        this.y += dy;
    };
    Circle.prototype.createPath = function(context) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    };
    // End Object Prototype /Circle.prototype/

    // Begin Object Constructor /State/
    State = function (centerX, centerY, text, radius, strokeStyle, fillStyle, filled) {
        this.x = centerX;
        this.y = centerY;
        this.center = new Point(centerX, centerY);
        this.radius = radius || 40;
        this.strokeStyle = strokeStyle || 'black';
        this.fillStyle = fillStyle || 'white';
        this.filled = filled || true;
        this.transitions = [];
        this.text = text || "";
        this.isEditingText = false;
        this.isSelected = false;
        this.startState = false;
        this.endState = false;
    };
    // End Object Constructor /State/

    // Begin Object Prototype /State.prototype/
    State.prototype = new Circle();
    // End Object Prototype /State.prototype/

    State.prototype.drawText= function (context){
            var line = new TextLine(this.center.x, this.center.y);
            line.text = this.isEditingText ? "" : this.text;
            line.draw(context);
    }

    State.prototype.stroke = function (context) {
        if (this.isSelected) {
            this.strokeStyle = 'green';
        } else {
            this.strokeStyle = 'black';
        }
       
        this.update();
       
        Circle.prototype.stroke.call(this, context);
        if (this.filled) {
            this.fill(context);
        }
        if (this.endState) {
            context.beginPath();
            context.arc(this.x, this.y, this.radius * 0.75, 0, Math.PI * 2, false);
            context.stroke();
        }
        this.drawText(context);
    }

    State.prototype.update = function() {
        this.center.x = this.x;
        this.center.y = this.y;
    }

    // Begin Object Constructor /Transition/
    Transition = function (startState, endState, text, strokeStyle, lineWidth) {
        this.startState = startState;
        this.endState = endState;
        this.text = text || "";
        this.isEditingText = false;
        this.lineWidth = lineWidth || 3;
        this.strokeStyle = strokeStyle || 'black';
        this.slope = 0;
        this.angle = 0;
        this.center = new Point(0, 0);
        this.center.x = this.startState.x - (this.startState.x - this.endState.x) / 2;
        this.center.y = this.startState.y - (this.startState.y - this.endState.y) / 2;
        this.circle = new Circle();
        this.controlPoint = new Circle(this.center.x, this.center.y, 3, this.strokeStyle);
        this.centerDistance = 0;
        this.distanceToControlPoint = 0;
        this.controlPointAngle = 0;
        this.isControlPointSelected = false;
        this.isSelected = false;
        this.modEndPoint = new Point(0, 0);
        this.modStartPoint = new Point(0, 0);
        this.selfState = new Circle(this.modStartPoint.x + 8, this.modStartPoint.y, 10, this.strokeStyle);
        this.modifier = 1;
        this.anchorPoint = new Point(0, 0);
        this.initalAnchorPoint = new Point(0, 0);
        this.isAnchorSet = false;
        this.isArched = false;
        this.distanceToIntersection = 0;
        this.update();
    };
    // End Object Constructor /Transition/

    // Begin Object Prototype /Transition.protottype/
    Transition.prototype = {
        update: function() {
            this.slope = (this.endState.y - this.startState.y) / (this.endState.x - this.startState.x);
            this.angle = Math.atan2((this.endState.y - this.startState.y), (this.endState.x - this.startState.x));
            this.center.x = this.startState.x - (this.startState.x - this.endState.x) / 2;
            this.center.y = this.startState.y - (this.startState.y - this.endState.y) / 2;
            this.modEndPoint.x = this.endState.x + + -1* this.endState.radius * Math.cos(this.angle);
            this.modEndPoint.y = this.endState.y + + -1* this.endState.radius * Math.sin(this.angle);
            this.modStartPoint.x = this.startState.x  + this.endState.radius * Math.cos(this.angle);
            this.modStartPoint.y = this.startState.y + this.endState.radius * Math.sin(this.angle);
            this.selfState.x = this.modStartPoint.x + 8;
            this.selfState.y = this.modStartPoint.y;
            this.centerDistance = fsm.math_util.getDistance(this.center.x, this.center.y, this.startState.x, this.startState.y);
            this.updateAnchorPoint();
           //this.updateControlPoint();
        },  
        modifyAnchorPoint: function(x, y){
            var distanceFromCenterToCirlceEdge = 0,
                minDistance = 5;

            this.anchorPoint.x = x;
            this.anchorPoint.y = y;
            
            this.circle = fsm.math_util.circleFrom3Points(this.startState.x, this.startState.y, this.endState.x, this.endState.y, this.anchorPoint.x, this.anchorPoint.y);
        
            if (!this.circle) {
                this.isArched = false;
            } else {
                var intersections = fsm.math_util.getineCircleIntersections(this.circle.x, this.circle.y, this.circle.radius, this.center, { x: this.circle.x, y: this.circle.y }),
                intersection = intersections.intersection2;
                distanceFromCenterToCirlceEdge = fsm.math_util.getDistance(intersection.x, intersection.y, this.center.x, this.center.y);

                if (distanceFromCenterToCirlceEdge >= minDistance) {
                    this.isArched = true;
                } else {
                    this.isArched = false;
                }
            }
        },
        updateAnchorPoint: function () {
            if (this.isArched) {
                //find distance between anchor point and line
                var intersections = fsm.math_util.getineCircleIntersections(this.circle.x, this.circle.y, this.circle.radius, this.center, { x: this.circle.x, y: this.circle.y }),
                    intersection = intersections.intersection1;
                    //distanceToIntersection1 = fsm.math_util.getDistance(intersections.intersection1.x, intersections.intersection1.y, this.anchorPoint.x, this.anchorPoint.y),
                    //distanceToIntersection2 = fsm.math_util.getDistance(intersections.intersection2.x, intersections.intersection2.y, this.anchorPoint.x, this.anchorPoint.y);

             //   this.distanceToIntersection = distanceToIntersection1 < distanceToIntersection2 ? distanceToIntersection1 : distanceToIntersection2;

              //  var intersection = 
                this.anchorPoint.x = intersection.x;
                this.anchorPoint.y = intersection.y;
                this.circle = fsm.math_util.circleFrom3Points(this.startState.x, this.startState.y, this.endState.x, this.endState.y, intersection.x, intersection.y);
            }
        },
      
        updateControlPoint: function () {
            if (this.controlPoint.x == this.center.x && this.controlPoint.y == this.center.y) {
                return false;
            }

            var tempPoint = fsm.math_util.pointDistanceAway(this.center.x, this.center.y, this.distanceToControlPoint, -1 / this.slope);

            this.controlPoint.x = tempPoint.x;
            this.controlPoint.y = tempPoint.y;
            this.circle = fsm.math_util.circleFrom3Points(this.startState.x, this.startState.y, this.endState.x, this.endState.y, this.controlPoint.x, this.controlPoint.y);
        },
        modifyControlPoint: function (x, y) {

            var direction = 1;
            //parallel line needs to reflect direction
            //parallel line equation
            var b1;
            b1 = y - x * this.slope;

            //normal line equation
            var b2, invertedSlope;
            invertedSlope = -1 / this.slope;
            b2 = this.center.y - this.center.x * invertedSlope;


            //update control point (this is the intersection point between our two lines)
            this.controlPoint.x = -1 * (b1 - b2) / (this.slope - invertedSlope);
            this.controlPoint.y = invertedSlope * this.controlPoint.x + b2;

            this.distanceToControlPoint = getDistance(this.center.x, this.center.y, this.controlPoint.x, this.controlPoint.y, direction);
        },
        isPointInPath : function (x, y) {
            var pointSlope,
             fluff = 10,
             pointToCirlce;


            //check that point is not inside states
            if (this.startState.isPointInPath(context, x, y)) {
                return false;
            } else if (this.endState.isPointInPath(context, x, y)) {
                return false;
            } else if (this.startState != this.endState && !this.isArched) {
                // find vector perpendicular to sloped line that runs through
                // x and y coordinates passed
                //http://mathworld.wolfram.com/Point-LineDistance2-Dimensional.html
                var distanceToLine = Math.abs((this.endState.x - this.startState.x) * (this.startState.y - y)
                        - (this.startState.x - x) * (this.endState.y - this.startState.y))
                    / Math.sqrt(
                        Math.pow(this.endState.x - this.startState.x, 2) + Math.pow(this.endState.y - this.startState.y, 2)
                    );

                if (distanceToLine >= -1 * fluff && distanceToLine < fluff) {
                    return true;
                } else {
                    return false;
                }
            } else if (this.isArched) {
                var outerFluffCircle = new Circle(this.circle.x, this.circle.y, this.circle.radius + fluff),
                    innerFluffCircle = new Circle(this.circle.x, this.circle.y, this.circle.radius - fluff);

                if (outerFluffCircle.isPointInPath(context, x, y) && !innerFluffCircle.isPointInPath(context, x, y)) {
                    return true;
                } else {
                    return false;
                }
            } else {
                //check to see if x and y are located inside
                //self transition (represented by Circle object)
                if (this.selfState.isPointInPath(context, x, y)) {
                    return true;
                } else {
                    return false;
                }
            }
        },
        drawControlPoint: function (context) {
            if (this.isControlPointSelected) {
                this.strokeStyle = 'red';
            } else {
                this.strokeStyle = 'black';
            }
            context.save();
            context.beginPath();
            context.arc(this.controlPoint.x, this.controlPoint.y, this.controlPoint.radius, 0, 2 * Math.PI, this.strokeStyle, true);
            context.fillStyle = this.strokeStyle;
            context.fill();
            context.stroke();
            context.restore();
        },
        drawText: function (context) {
            var line = (this.isArched ? new TextLine(this.anchorPoint.x, this.anchorPoint.y) : new TextLine(this.center.x, this.center.y));
            line.text = this.isEditingText ? "" : this.text;
            line.draw(context);
        },
        stroke: function (context) {
            //update line slope variables
            this.update();
            if (this.isSelected) {
                this.strokeStyle = 'blue';
            } else {
                this.strokeStyle = 'black';
            }
            if (this.startState != this.endState) {
              
                //if (this.controlPoint.x != this.center.x || this.controlPoint.y != this.center.y) {
                
                //    var startAngle = Math.atan2(this.startState.y - this.circle.y, this.startState.x - this.circle.x);
                //    var endAngle = Math.atan2(this.endState.y - this.circle.y, this.endState.x - this.circle.x);
                //    this.drawArcedArrow(this.circle.x, this.circle.y, this.circle.radius, startAngle, endAngle, false, false, 10);
                //} 
                if (this.isArched) {
                    var startAngle = Math.atan2(this.startState.y - this.circle.y, this.startState.x - this.circle.x);
                    var endAngle = Math.atan2(this.endState.y - this.circle.y, this.endState.x - this.circle.x);
                    var middleAngle = Math.atan2(this.anchorPoint.y - this.circle.y, this.anchorPoint.x - this.circle.x);
                    var counterClockwise = this.startState.y < this.controlPoint.y ? false : true;
                    var startAngle, endAngle;


                    if (endAngle - startAngle == Math.PI * 2) {
                       // this._texData += '\\draw [' + this.strokeStyle + '] (' + fixed(x, 3) + ',' + fixed(-y, 3) + ') circle (' + fixed(radius, 3) + ');\n';
                    } else {
                        if (this.anchorPoint.x == Math.min(this.startState.x, this.endState.x, this.anchorPoint.x)){//isReversed) {
                            var temp = startAngle;
                            startAngle = endAngle;
                            endAngle = temp;
                        }
                        if (endAngle < startAngle) {
                            endAngle += Math.PI * 2;
                        }
                        // TikZ needs the angles to be in between -2pi and 2pi or it breaks
                        if (Math.min(startAngle, endAngle) < -2 * Math.PI) {
                            startAngle += 2 * Math.PI;
                            endAngle += 2 * Math.PI;
                        } else if (Math.max(startAngle, endAngle) > 2 * Math.PI) {
                            startAngle -= 2 * Math.PI;
                            endAngle -= 2 * Math.PI;
                        }
                        startAngle = -startAngle;
                        endAngle = -endAngle;
                    }

                    //if (this.anchorPoint.x < this.circle.x || this.anchorPoint.y < this.circle.y){
                    //    startAngle = angle1;
                    //    endAngle = angle2;
                    //} else {
                    //    startAngle = angle2;
                    //    endAngle = angle1;
                    //}
                   
                    context.save();
                    //context.strokeStyle = this.strokeStyle;
                    //context.lineWidth = this.lineWidth;
                    context.beginPath();
                    context.arc(this.circle.x, this.circle.y, this.circle.radius, startAngle, endAngle);
                    //context.arc(this.circle.x, this.circle.y, this.circle.radius, middleAngle, endAngle);
                    context.stroke();
                    context.restore();
                   // this.drawArcedArrow(context, this.circle.x, this.circle.y, this.circle.radius, startAngle, endAngle, counterclcokwise, false, 10);
                } else {
                    this.drawArrow(context, this.modStartPoint.x, this.modStartPoint.y, this.modEndPoint.x, this.modEndPoint.y, this.angle);
                }
              
              //  
            } else {
                this.drawArcedArrow(context, this.selfState.x, this.selfState.y, this.selfState.radius, 7 * Math.PI / 6, 5* Math.PI/6, false, false, 10);
            }
        //    this.drawControlPoint(context);
            this.drawText(context);
        },
       
        drawArrow: function (context, x1, y1, x2, y2, angle, arrowAngle, length) {
            if (!x1 || !y1 || !x2 || !y2 || !angle) {
                return false;
            }
            arrowAngle = arrowAngle || Math.PI / 8;
            length = length || 20;
           
            context.save();
            context.strokeStyle = this.strokeStyle;
            context.lineWidth = this.lineWidth;
            context.beginPath();
            
            if (this.controlPoint.x == this.center.x && this.controlPoint.y == this.center.y) {
                context.moveTo(x1, y1);
                context.lineTo(x2, y2);
            } else {
                context.moveTo(this.modStartPoint.x, this.modStartPoint.y);
                context.lineTo(this.modEndPoint.x, this.modEndPoint.y);
            }
           
            
            context.stroke();
            context.restore();
            this.drawArrowHead(context, x2, y2, angle, arrowAngle, length);
        },
        drawArrowHead: function (context, x, y, angle, arrowAngle, length) {
            if (!x || !y || !angle) {
                return false;
            }
            arrowAngle = arrowAngle || Math.PI / 8;
            length = length || 20;
            var
               angle1 = angle + Math.PI + arrowAngle,
               topx = x + Math.cos(angle1) * length,
               topy = y + Math.sin(angle1) * length,
               angle2 = angle + Math.PI - arrowAngle,
               botx = x + Math.cos(angle2) * length,
               boty = y + Math.sin(angle2) * length
            ;
            context.save();
            context.strokeStyle = this.strokeStyle;
            context.lineWidth = this.lineWidth;
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(topx, topy);
            context.moveTo(x, y);
            context.lineTo(botx, boty);
            context.moveTo(x, y);
            context.stroke();
            context.restore();
        },
        drawArcedArrow: function (context, x, y, radius, startAngle, endAngle, counterClockwise, arrowAngle, length) {
            var sx, sy, lineangle, destx, desty;

            sx = Math.cos(startAngle) * radius + x;
            sy = Math.sin(startAngle) * radius + y;
            lineangle = Math.atan2(x - sx, sy - y);
            counterClockwise = counterClockwise || false;

            if (counterClockwise) {
                destx = sx + 10 * Math.cos(lineangle);
                desty = sy + 10 * Math.sin(lineangle);
            } else {
                destx = sx - 10 * Math.cos(lineangle);
                desty = sy - 10 * Math.sin(lineangle);
            }
            
            context.save();
            context.strokeStyle = this.strokeStyle;
            context.lineWidth = this.lineWidth;
            context.beginPath();
            context.arc(x, y, radius, startAngle, endAngle, counterClockwise);
            context.stroke();
            context.restore();

            this.drawArrowHead(sx, sy, endAngle, arrowAngle, length);
           
        }
    };
    // End Object Prototype /Transition.prototype/


    TextCursor = function(width, fillStyle) {
        this.fillStyle = fillStyle || 'rgba(0,0,0,0.5)';
        this.width = width || 2;
        this.left = 0;
        this.top = 0;
    };
    TextCursor.prototype = {
        getHeight: function(context) {
            var h = context.measureText('W').width;
            return h + h / 6;
        },
        createPath: function(context) {
            context.beginPath();
            context.rect(this.left, this.top,
                this.width, this.getHeight(context));
        },
        draw: function(context, left, bottom) {
            context.save();
            this.left = left;
            this.top = bottom - this.getHeight(context);
            this.createPath(context);
            context.fillStyle = this.fillStyle;
            context.fill();
            context.restore();
        },
        erase: function(context, imageData) {
            context.putImageData(imageData, 0, 0,
                this.left, this.top,
                this.width, this.getHeight(context));
        }
    };

    // Begin Object Constructor /TextLine/
    TextLine = function (x, y) {
        this.text = '';
        this.left = x;
        this.bottom = y;
        this.caret = 0;
        this.font = settingsMap.font;
    };
    // End Object Constructor /TextLine/

    // Begin Object Prototype /TextLine.prototype/
    TextLine.prototype = {
        insert: function(text) {
            this.text = this.text.substr(0, this.caret) + text +
                this.text.substr(this.caret);
            this.caret += text.length;
        },
        replace: function(text) {
            this.text = text;
            this.caret = text.length;
        },
        removeCharacterBeforeCaret: function() {
            if (this.caret === 0)
                return;
            this.text = this.text.substring(0, this.caret - 1) +
                this.text.substring(this.caret);
            this.caret--;
        },
        getWidth: function(context) {
            return context.measureText(this.text).width;
        },
        getHeight: function(context) {
            var h = context.measureText('W').width;
            return h + h / 6;
        },
        draw: function(context) {
            context.save();
            context.font = this.font;
            context.strokeStyle = 'white';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.strokeText(this.text, this.left, this.bottom);
            context.fillText(this.text, this.left, this.bottom);
            context.restore();
        },
        erase: function(context, imageData) {
            context.putImageData(imageData, 0, 0);
        }
    };
    // End Object Prototype /TextLine.prototype/
    // Constructor........................................................
    Vector = function(x, y) {
        this.x = x;
        this.y = y;
    };
    // Prototype..........................................................
    Vector.prototype = {
        getMagnitude: function () {
            return Math.sqrt(Math.pow(this.x,
            2) +
            Math.pow(this.y, 2));
        },
        add: function (vector) {
            var v = new Vector();
            v.x = this.x + vector.x;
            v.y = this.y + vector.y;
            return v;
        },
        subtract: function (vector) {
            var v = new Vector();
            v.x = this.x - vector.x;
            v.y = this.y - vector.y;
            return v;
        },
        dotProduct: function (vector) {
            return this.x * vector.x +
            this.y * vector.y;
        },
        edge: function (vector) { return
            this.subtract(vector);
        },
        perpendicular: function () {
            var v = new Vector();
            v.x = this.y;
            v.y = 0-this.x;
            return v;
        }, 
        normalize: function () {
            var v = new Vector(0, 0),
            m = this.getMagnitude();
            if (m != 0) {
                v.x = this.x / m;
                v.y = this.y / m;
            }
            return v;
        },
        normal: function () {
            var p = this.perpendicular();
            return p.normalize();
        }
    };
    //----------------- END OBJECT CONSTRUCTORS ------------------

    //-------------------- BEGIN UTILITY METHODS -----------------
    // Returns copy of stored anchor map; minimized overhead
    copyAnchorMap = function() {
        return $.extend(true, {}, stateMap.anchor_map);
    };

    // Begin Utility Method /windowToCanvas/
    windowToCanvas = function(canvas, x, y) {
        var bbox = canvas.getBoundingClientRect();
        return {
            x: x - bbox.left * (canvas.width / bbox.width),
            y: y - bbox.top * (canvas.height / bbox.height)
        };
    };
    // End Utility Method /windowToCanvas/

    

    //--------------------- END UTILITY METHODS ------------------

    //--------------------- BEGIN DOM METHODS --------------------
    // Begin DOM method /setJqueryMap/
    setJqueryMap = function() {
        var $container = stateMap.$container;
        jqueryMap = {
            $container: $container,
            $graph: $('#fsm-graph'),
            $graphCopy: $('#fsm-graph-copy'),
            $printGraph: $('#fsm-graph-print'),
            $graphImg: $('#fsm-graph-img'),
            $graphContainer: $('#fsm-graph-container')
        };
    };
    // End DOM method /setJqueryMap/

    //Begin DOM method /changeAnchorPart/
    // Purpose : Changes part of the URI anchor component
    // Arguments:
    //      * arg_map - The map describing what part of the URI anchor
    //        we want changed.
    //  Returns : boolean
    //      * true - the Anchor portion of the URI was update
    //      * false - the Anchor portion of the URI could not be updated
    //  Action :
    //      The current anchor rep stored in stateMap.anchor_map.
    //      See uriAnchor for discussion of encoding.
    //      This method
    //          * Creates a copy of this map using copyAnchorMap().
    //          * Modifies the key-values using arg_map.
    //          * Manages the distinction between independent
    //            and dependent values in the endcoding.
    //          * Attempt to change the URI using uriAnchor
    //          * Returns true on succes, and false on failure.
    //
    changeAnchorPart = function(arg_map) {
        var
            anchor_map_revise = copyAnchorMap(),
            bool_return = true,
            key_name,
            key_name_dep;

        // Begin merge changes into anchor map
        KEYVAL:
            for (key_name in arg_map) {
                if (arg_map.hasOwnProperty(key_name)) {
                    // skip dependent keys during iteration
                    if (key_name.indexOf('_') === 0) {
                        continue KEYVAL;
                    }

                    // update independent key value
                    anchor_map_revise[key_name] = arg_map[key_name];

                    // update matching dependent key
                    key_name_dep = "_" + key_name;
                    if (arg_map[key_name_dep]) {
                        anchor_map_revise[key_name_dep] = arg_map[key_name_dep];
                    } else {
                        delete anchor_map_revise[key_name_dep];
                        delete anchor_map_revise['_s' + key_name_dep];
                    }
                }

            }
        // End merge changes into anchor map

        // Begin attempt to update URI; revert if not successful
        try {
            $.uriAnchor.setAnchor(anchor_map_revise);
        } catch (error) {
            // replace URI with existing state
            $.uriAnchor.setAnchor(stateMap.anchor_map, null, true);
            bool_return = false;
        }
        // End attempt to update URI...

        return bool_return;
    };
    // End DOM method /changeAnchorPart/

    // Begin DOM method /drawGrid/
    drawGrid = function (context, color, stepx, stepy) {
        var i;

        context.strokeStyle = color;
        context.lineWidth = 0.5;
        for (i = stepx + 0.5; i < context.canvas.width ; i += stepx) {
            context.beginPath();
            context.moveTo(i, 0);
            context.lineTo(i, context.canvas.height);
            context.stroke();
        }
        for (i = stepy + 0.5 ; i < context.canvas.height ; i += stepy) {
            context.beginPath();
            context.moveTo(0, i);
            context.lineTo(context.canvas.width, i);
            context.stroke();
        }
    };
    // End DOM method /drawGrid/

    drawHorizontalLine = function (y) {
        context.beginPath();
        context.lineWidth = 1;
        context.moveTo(0, y + 0.5);
        context.lineTo(context.canvas.width, y + 0.5);
        context.stroke();
    };

    drawVerticalLine = function (x) {
        context.beginPath();
        context.moveTo(x + 0.5, 0);
        context.lineTo(x + 0.5, context.canvas.height);
        context.stroke();
    };

    drawGuidewires = function (x, y) {
        context.save();
        context.strokeStyle = 'rgba(0,0,230,0.8)';
        context.lineWidth = 0.5;
        drawVerticalLine(x);
        drawHorizontalLine(y);
        context.restore();
    };
    
    updateRubberbandRectangle = function (loc) {
        stateMap.rubberbandRect.width = Math.abs(loc.x - stateMap.mouseDown.x);
        stateMap.rubberbandRect.height = Math.abs(loc.y - stateMap.mouseDown.y);
        if (loc.x > stateMap.mouseDown.x) {
            stateMap.rubberbandRect.left = stateMap.mouseDown.x;
        }
        else {
            stateMap.rubberbandRect.left = loc.x;
        }
        if (loc.y > stateMap.mouseDown.y) {
            stateMap.rubberbandRect.top = stateMap.mouseDown.y;
        }
        else {
            stateMap.rubberbandRect.top = loc.y;
        }
    };

    // Begin DOM method /drawParallelLine/
    drawParallelLine = function(x1, y1, slope) {
        var b, yInterceptPoint, extendedPoint;

        b = y1 - x1 * slope;

        //create new point for y intercept
        yInterceptPoint = new Point(0, b);

        //find point off of the canvas since we have line equation
        // y = mx + b
        // substitute canvas width in for x to find y value
        extendedPoint = new Point(canvas.width, slope * canvas.width + b);

        context.beginPath();
        context.moveTo(yInterceptPoint.x, yInterceptPoint.y);
        context.lineTo(extendedPoint.x, extendedPoint.y);
        context.stroke();
    };
    // End DOM method /drawParallelLine/

    // Begin DOM method /drawNormalLine/
    drawNormalLine = function(x1, y1, slope) {
        var b, y, yInterceptPoint, extendedPoint, invertedSlope;

        invertedSlope = -1 / slope;

        b = y1 - x1 * invertedSlope;

        //create new point for y intercept
        yInterceptPoint = new Point(0, b);

        //find point off of the canvas since we have line equation
        // y = mx + b
        // substitute canvas width in for x to find y value
        extendedPoint = new Point(canvas.width, invertedSlope * canvas.width + b);

        context.beginPath();
        context.moveTo(yInterceptPoint.x, yInterceptPoint.y);
        context.lineTo(extendedPoint.x, extendedPoint.y);
        context.stroke();
    };
    // End DOM method /drawNormalLine/

    // Begin DOM metho /drawIntersectionPoint/
    drawIntersectionPoint = function(x1, y1, x2, y2, slope) {
        //parallel line equation
        var b1;
        b1 = y1 - x1 * slope;

        //normal line equation
        var b2, invertedSlope;
        invertedSlope = -1 / slope;
        b2 = y2 - x2 * invertedSlope;


        //find intersection point
        var intersectionPoint = new Point(0, 0);

        intersectionPoint.x = -1 * (b1 - b2) / (slope - invertedSlope);
        intersectionPoint.y = invertedSlope * intersectionPoint.x + b2;

       

        context.beginPath();
        context.moveTo(intersectionPoint.x, intersectionPoint.y);
        context.arc(intersectionPoint.x, intersectionPoint.y, 5, 0, Math.PI * 2, true);
        context.stroke();
    };
    // End DOM method /drawIntersectionPoint/

    // Begin DOM method /startDragging/
    startDragging = function (loc) {
        saveDrawingSurface();
        stateMap.mouseDown.x = loc.x;
        stateMap.mouseDown.y = loc.y;
    };
    // End DOM method /beginDraggingstartDragging/

    // Begin DOM method /saveDrawingSurface/
    saveDrawingSurface = function () {
        stateMap.drawingSurfaceImageData = context.getImageData(0, 0,
                                            canvas.width,
                                            canvas.height);
    };
    // End DOM method /saveDrawingSurface/

    // Begin DOM method /restoreDrawingSurface/
    restoreDrawingSurface = function () {
        if (stateMap.drawingSurfaceImageData != null) {
            context.putImageData(stateMap.drawingSurfaceImageData, 0, 0);
        }
    };
    // End DOM method /restoreDrawingSurface/


    // Begin DOM method /setSelectedObject/
    setSelectedObject = function (obj) {
        unselectObject(stateMap.selectedObject);
        stateMap.selectedObject = obj;
        if (obj != null) {
            obj.isSelected = true;
        }
        resetContext();
    };
    // End DOM method /setSelectedObject/

    // Begin DOM method /unselectObject/
    unselectObject = function (obj) {
        if (obj != null){
            obj.isSelected = false;
        }
        stateMap.selectedObject = null;
    };
    // End DOM method /unselectObject/

    // Begin DOM method /moveCursorblinkCursor/
    blinkCursor = function (loc) {
       
        configMap.blinkingInterval = setInterval(function (e) {
            cursor.erase(context, stateMap.drawingSurfaceImageData);
            if (!stateMap.isEditingText) {
                return false;
            }
            setTimeout(function (e) {
                cursor.draw(context, cursor.left,
                cursor.top + cursor.getHeight(context));
               
            }, settingsMap.BLINK_OFF);
        }, settingsMap.BLINK_ON + settingsMap.BLINK_OFF);
    };
    // End DOM method /blinkCursor/

    // Begin DOM method /moveCursor/
    moveCursor = function (x, y) {
        if (stateMap.drawingSurfaceImageData != null) {
            cursor.erase(context, stateMap.drawingSurfaceImageData);
        }
       
        saveDrawingSurface();
        context.putImageData(stateMap.drawingSurfaceImageData, 0, 0);
        cursor.draw(context, x, y);
       // blinkCursor(x, y);
    };
    // End DOM method /moveCursor/
    
    // Begin DOM method /setText/
    setText = function (state) {
        state.setText(context);
    };
    // End DOM method /setText/

    // Begin DOM method /resetCanvas/
    resetContext = function (hideGrid) {

        //capture an image of the canvas and pubilsh it
        if (!stateMap.dragging && !stateMap.isEditingText) {
       //     captureCanvas();
        }
        var context = canvas.getContext('2d');


        context.clearRect(0, 0, canvas.width / stateMap.zoomLevel, canvas.height / stateMap.zoomLevel);
        if (!hideGrid) {
            drawGrid(context, 'light gray', 10, 10);
        }
        drawStates(context);


    }
    // End DOM method /resetCanvas/

    // Begin DOM method /captureCanvas/
    captureCanvas = function () {
        var context = jqueryMap.$graphCopy[0].getContext('2d');

        jqueryMap.$graphCopy[0].width = jqueryMap.$graphCopy[0].width;

        drawStates(context);
        stateMap.img = jqueryMap.$graphCopy[0].toDataURL();
        $.gevent.publish('fsm-graph-updated', { img: stateMap.img });

    };
    // End DOM method /captureCanvas/

    // Begin DOM method /drawStates/
    drawStates = function (context) {

        stateMap.states.forEach(function (state) {
            drawState(context, state);
            drawTransitions(context, state);
        });


    };
    // End DOM method /drawStates/

    // Begin DOM method /drawState/
    drawState = function (context, state) {
        context.beginPath();
        context.lineWidth = 5;
        state.createPath(context);
        state.stroke(context);
    };
    // End DOM method /drawState/
    // Begin DOM method /drawTransition/
    drawTransition = function (context, transition) {
        transition.stroke(context);
    }; 
    // End DOM method /drawTransition/
    // Begin DOM method /drawTransitions/
    drawTransitions = function (context, state) {
        var i;
        for (i = 0; i < state.transitions.length; i++) {
            if (stateMap.states.indexOf(state.transitions[i].endState) >= 0) {
                drawTransition(context, state.transitions[i]);
            } else {
                //clean up any dangling transitions
                state.transitions.splice(i, 1);
            }
        }
    };
    // End DOM method /drawTransitions/
    // Begin DOM method /drawToPoint/
    drawToPoint = function (fromLoc, toLoc) {
        var strokeStyle = 'black',
            lineWidth = 2;
        context.save();
        context.strokeStyle = strokeStyle;
        context.beginPath();
        context.moveTo(fromLoc.x, fromLoc.y);
        context.lineWidth = lineWidth;
        context.lineTo(toLoc.x, toLoc.y);
        context.stroke();
        context.restore();
    }
    // End DOM method /drawToPoint/
    // Begin DOM method /deleteObject/
    deleteObject = function(obj) {
        var index,
            objDeleted = false;
        if (obj instanceof State) {
            index = stateMap.states.indexOf(obj);
            if (index >= 0) {
                stateMap.states.splice(index, 1);
                objDeleted = true;
            }
        } else if (obj instanceof Transition) {
            stateMap.states.forEach(function (state) {
                index = state.transitions.indexOf(obj);
                if (index >= 0) {
                    state.transitions.splice(index, 1);
                    objDeleted = true;
                    return;
                }
            });
        } 
        return objDeleted;
    }
    // End DOM method /deleteObject/

    // Begin DOM method /findStateAtPosition/
    findStateAtPosition = function (states, x, y) {
        for (i = 0; i < states.length; i++) {
            if (states[i].x == x && states[i].y == y) {
                return states[i];
            }
        }
        return false;
    }
    // End DOM method /findStateAtPosition/

    // Begin DOM method /resizeCanvas/
    resizeCanvas = function () {
        //get width of canvas container
        var c_width = jqueryMap.$graphContainer.width(),
            c_height = jqueryMap.$graphContainer.height(),
            g_width = jqueryMap.$graph.width(),
            g_height = jqueryMap.$graph.height(),
            width_percent = c_width / g_width,
            height_percent = c_height / g_height;

        //check to see if canvas is bigger than container
        if (width_percent < 1 || height_percent < 1) {
            $.gevent.publish('fsm-graph-resize', { width: width_percent, height: height_percent });
        }
    };
    // End DOM method /resizeCanvas/
    //--------------------- END DOM METHODS ----------------------

    //------------------- BEGIN EVENT HANDLERS -------------------

    // Begin Event Hanlder /onClick/
    onClick = function (e) {
        stateMap.hasFocus = true;
        e.stopPropagation();
    };
    // End Event Handler /onClick/

    // Begin Event Hanlder /onDoubleClick/
    onDoubleClick = function (event) {
        var state,
            context = canvas.getContext('2d');

        if (stateMap.selectedObject instanceof State) {
            stateMap.selectedObject.createPath(context);
            if (context.isPointInPath(loc.x, loc.y)) {
                stateMap.selectedObject.endState = true;
                resetContext();
                return false;
            }
        } else if (stateMap.selectedObject instanceof Transition) {
            if (stateMap.selectedObject.isPointInPath(loc.x, loc.y)) {
                return false;
            }
        }

        state = new State(loc.x, loc.y);
        setSelectedObject(state);
       
        drawState(context, state);
        stateMap.states.push(state);
      
        resetContext();
        setTimeout(function () {
            captureCanvas();
        }, 10);
  
        return true;
    };
    // End Event Handler /onDoubleClick/

    // Begin Event Hanlder /onMouseDown/
    onMouseDown = function (e) {
        var objClicked = false, i = 0;

        loc = windowToCanvas(canvas, e.clientX, e.clientY);

        if (stateMap.isEditingText) {
            stateMap.selectedObject.isEditingText = false;
            stateMap.selectedObject.text = line.text;
            line.text = "";
            resetContext();
            stateMap.isEditingText = false;
            moveCursor(0, 0);
        }
        stateMap.states.forEach(function (state) {
       
            if (state.isPointInPath(context, loc.x, loc.y)) {
                objClicked = true;
                setSelectedObject(state);

                if (e.shiftKey) { // Netscape/Firefox/Opera
                    startDragging(loc);
                    stateMap.dragging = new Point(state.x, state.y);
                    stateMap.draggingOffsetX = (loc.x - state.x);
                    stateMap.draggingOffsetY = (loc.y - state.y);
                    return;
                } else {
                    stateMap.dragging = state;
                    stateMap.draggingOffsetX = loc.x - state.x;
                    stateMap.draggingOffsetY = loc.y - state.y;
                    return;
                }
            } else {
                for (i = 0; i < state.transitions.length; i++) {
                    if (state.transitions[i].isPointInPath(loc.x, loc.y)) {
                        objClicked = true;
                        setSelectedObject(state.transitions[i]);
                        stateMap.dragging = new Point(loc.x, loc.y);
                        stateMap.draggingOffsetX = 0;
                        stateMap.draggingOffsetY = 0;
                    } 
                }
            }
        });
        if (!objClicked) {
            setSelectedObject(null);
        }
        return objClicked;
    };
    // End Event Handler /onMouseDown/

    // Begin Event Handler /onMouseUp/
    onMouseUp = function (e) {
        var transition;

        loc = windowToCanvas(canvas, e.clientX, e.clientY);

        if (stateMap.dragging && e.shiftKey && stateMap.selectedObject instanceof State) {
            stateMap.states.forEach(function(state) {
                state.createPath(context);
                if (context.isPointInPath(loc.x, loc.y)
                    ) {
                    transition = new Transition(stateMap.selectedObject, state);
                    stateMap.selectedObject.transitions.push(transition);
                    setSelectedObject(transition);
                    return;
                }
            });
  
        }

       

        
        resetContext();
        if (stateMap.dragging) {
            setTimeout(function () {
                captureCanvas();
            }, 10);
        }
        stateMap.dragging = false;
    };
    // End Event Handler /onMouseUp

    // Begin Event Handler /onMouseMove/
    onMouseMove = function (e) {
        loc = windowToCanvas(canvas, e.clientX, e.clientY);
        e.preventDefault(); // Prevent selections
        if (stateMap.selectedObject instanceof Transition  && !stateMap.isEditingText) {
            resetContext();
        }
        if (stateMap.dragging) {
            //set the x and y coordinates of the object we are dragging
            //we modify by the offset as well as the current zoom level
            stateMap.dragging.x = (loc.x - stateMap.draggingOffsetX);
            stateMap.dragging.y = (loc.y - stateMap.draggingOffsetY);
            if (stateMap.selectedObject instanceof Transition && stateMap.dragging instanceof Point) {
                stateMap.selectedObject.modifyAnchorPoint(stateMap.dragging.x, stateMap.dragging.y);
            }
        
            resetContext();
            if (stateMap.dragging instanceof Point) {
                drawToPoint(stateMap.selectedObject, loc);
            }
            if (settingsMap.guide_wires) {
                if (stateMap.dragging instanceof Point) {
                    drawGuidewires(loc.x, loc.y);
                }
                //else if (stateMap.dragging instanceof Circle && stateMap.selectedObject instanceof Transition) {
                //    drawParallelLine(stateMap.selectedObject.controlPoint.x, stateMap.selectedObject.controlPoint.y, stateMap.selectedObject.slope);
                //    drawNormalLine(stateMap.selectedObject.controlPoint.x, stateMap.selectedObject.controlPoint.y, stateMap.selectedObject.slope);
                //}
                else {
                    drawGuidewires(stateMap.dragging.x, stateMap.dragging.y);
                }
            }
        }
        
    };
    // End Event Handler /onMouseMove/

    // Begin Event Handler /onInputChange/
    onInputChange = function (e, input) {
        var key,
            text = input;
        //loop through regex patterns until match
        //then replace pattern match with special char
        for (key in patternMap) {
            text = text.replace(patternMap[key], function (all, match) {
                return specialCharMap[key];
            });
        }
        return $('<div>').html(text).text();
        return false;
    };
    // End Event Handler /onInputChange/

    // Begin Event Handler /onGraphLoad/
    onGraphLoad = function (e, graph_map) {
        var i, j, k, state, startState, endState, transition, states = [],
            graph = graph_map.graph;


        stateMap.states = [];

        //populate state and tranistion arrays
        for (i = 0; i < graph.states.length; i++) {
            state = new State(graph.states[i].x, graph.states[i].y, graph.states[i].text);
            state.endState = graph.states[i].endState;
            state.startState = graph.states[i].startState;
            stateMap.states.push(state);
            states.push({ state: state, transitions: graph.states[i].transitions })
        }
        
        //find the state with matching start state
        //TO-DO: Optimize.  This is running at O(N^3)
        for (i = 0; i < graph.states.length; i++) {
            for (j = 0; j < graph.states[i].transitions.length; j++) {
                transition = graph.states[i].transitions[j];
                startState = findStateAtPosition(
                    stateMap.states,
                    transition.startState.x,
                    transition.startState.y);

                endState = findStateAtPosition(
                    stateMap.states,
                    transition.endState.x,
                    transition.endState.y);

                if (!startState || !endState) {
                    return false;
                }

                startState.transitions.push(new Transition(startState, endState, onInputChange(null,transition.text)));
            }
        }

        $.gevent.publish('fsm-load-complete', { name: graph.name, states: stateMap.states });

        resetContext();
    };
    // End Event Handler /onGraphLoad/

    // Begin Event Handler /onGraphPrint/
    onGraphPrint = function (e) {
        resetContext(true);
        var img = jqueryMap.$graph[0].toDataURL();
        resetContext();
        jqueryMap.$graphImg.attr('src', img);
        //var w = window.open();
        var html = $(jqueryMap.$printGraph).html();

        $.gevent.publish('fsm-print-return', { content: html });
        // how do I write the html to the new window with JQuery?
        //$(w.document.body).html(html);
        //w.print();
    };
    // End Event Handler /onGraphPrint/

    //Begin event handler /onScroll/
    onScroll = function (e) {
        if (stateMap.navMoved) {
            stateMap.navMoved = false;
        } else {
            $.gevent.publish('fsm-graph-scroll', { top_percent: $(this).scrollTop() / jqueryMap.$graph.height(), left_percent: $(this).scrollLeft() / jqueryMap.$graph.width() });
        }
    };
    //End event handerl /onScroll/

    // Begin event handler /onKeyDown/
    onKeyDown = function (e) {
        var delReturnVal;
        if (!stateMap.hasFocus) {
            return;
        }
           
        if (e.keyCode === 8 || e.keyCode === 13) {
            // The call to e.preventDefault() suppresses the browser's
            // subsequent call to document.onkeypress(), so
            // only suppress that call for Backspace and Enter.
            e.preventDefault();
        }
        if (stateMap.selectedObject == null) {
            return false;
        }
        if (e.keyCode === 8) { // Backspace
            if (!stateMap.isEditingText) {
                stateMap.isEditingText = true;
                fontHeight = context.measureText('W').width;
                fontHeight += fontHeight / 6;
                stateMap.selectedObject.isEditingText = true;
                line = new TextLine(stateMap.selectedObject.center.x, stateMap.selectedObject.center.y);
                line.insert(stateMap.selectedObject.text);
                moveCursor(line.left + line.getWidth(context) * 0.6, line.bottom + line.getHeight(context) *0.5);
                        
            }
            resetContext();
            context.save();
                    
            line.removeCharacterBeforeCaret();
            moveCursor(line.left + line.getWidth(context) * 0.6, line.bottom + line.getHeight(context) * 0.5);
            line.erase(context, stateMap.drawingSurfaceImageData);
            line.draw(context);
                   
            context.restore();
                    
                    
        } else if (e.keyCode === 46) { // Delete 
            delReturnVal = deleteObject(stateMap.selectedObject);
            if (delReturnVal) {
                stateMap.selectedTransition = null;
                resetContext();
            }
        }
    };
    // End event handler /onKeyDown/

    // Begin event handler /onKeyPress/
    onKeyPress = function (e) {
        if (!stateMap.hasFocus) {
            return;
        }
        var key = String.fromCharCode(e.which),
            keyReplace;
        if (stateMap.selectedObject == null) {
            return false;
        }
        if (!stateMap.isEditingText) {
            stateMap.isEditingText = true;
            fontHeight = context.measureText('W').width;
            fontHeight += fontHeight / 6;
            stateMap.selectedObject.isEditingText = true;
            line = new TextLine(stateMap.selectedObject.center.x, stateMap.selectedObject.center.y);
            line.insert(stateMap.selectedObject.text);
            moveCursor(line.left + line.getWidth(context) * 0.6, line.bottom + line.getHeight(context) * 0.5);
        }
        if (e.keyCode !== 8 && !e.ctrlKey && !e.metaKey) {
            resetContext();
            e.preventDefault(); // No further browser processing
            context.save();
            line.insert(key);
            keyReplace = onInputChange(e, line.text);
            line.replace(keyReplace);
            stateMap.selectedObject.text = line.text;
            moveCursor(line.left + line.getWidth(context) * 0.6, line.bottom + line.getHeight(context) * 0.5);
            line.draw(context);
            context.restore();
        }
    };
    // End event handler /onKeyPress/

    // Begin event handler /onZoomOut/
    onZoomOut = function (event) {
        if (stateMap.zoomLevel > 1) {
            canvas.width = canvas.width;
            stateMap.zoomLevel -= 0.2;
            context = canvas.getContext('2d');
            jqueryMap.$graph.attr({ width: settingsMap.width * stateMap.zoomLevel, height: settingsMap.height * stateMap.zoomLevel });
            jqueryMap.$graph.css({ width: settingsMap.width * stateMap.zoomLevel, height: settingsMap.height * stateMap.zoomLevel });
            //context.translate(-((newWidth - canvas.width) / 2), -((newHeight - canvas.height) / 2));
            context.scale(stateMap.zoomLevel, stateMap.zoomLevel);

            resetContext();
            //  context.restore();
            resizeCanvas();
            // $.gevent.publish('fsm-zoom', { zoom: stateMap.zoomLevel });
        }
    };
    // End event handler /onZoomOut/

    // Begin event handler /onZoomIn/
    onZoomIn = function (event) {

        if (stateMap.zoomLevel < 3) {
            canvas.width = canvas.width;
            context = canvas.getContext('2d');
            stateMap.zoomLevel += 0.2;
            jqueryMap.$graph.attr({ width: settingsMap.width * stateMap.zoomLevel, height: settingsMap.height * stateMap.zoomLevel });
            jqueryMap.$graph.css({ width: settingsMap.width * stateMap.zoomLevel, height: settingsMap.height * stateMap.zoomLevel });
            //context.translate(-((newWidth - canvas.width) / 2), -((newHeight - canvas.height) / 2));
            context.scale(stateMap.zoomLevel, stateMap.zoomLevel);

            resetContext();
            //  context.restore();
            resizeCanvas();
            //  $.gevent.publish('fsm-zoom', { zoom: stateMap.zoomLevel });
        }
    };
    // End evet handler /onZoomIn/

    // Begin event hander /onExport/
    onExport = function (e) {
        var states = {}, statesString, state, transition, i, j, w;

        //build states object
        for (i = 0; i < stateMap.states.length; i++) {
            state = stateMap.states[i];
            states[state.text] = {};
            for (j = 0; j < state.transitions.length; j++) {
                transition = state.transitions[j];
                states[state.text][transition.text] = transition.endState.text;
            }
        }
        //stringify object
        statesString = JSON.stringify(states, undefined, 4);

        $.gevent.publish('fsm-export-return', { content: statesString });
    };
    // End event handler /onExport/

    //-------------------- END EVENT HANDLERS --------------------
    //------------------- BEGIN PUBLIC METHODS -------------------
    // Begin Public method /initModule/
    initModule = function ($container) {
        // load HTML and map jQuery collections
        stateMap.$container = $container;
        $container.html(configMap.main_html);
        setJqueryMap();
        canvas = jqueryMap.$graph[0];
        context = canvas.getContext('2d');
        cursor = new TextCursor();
        drawGrid(context, 'lightgray', 10, 10);
        jqueryMap.$graph.attr({ width: settingsMap.width , height: settingsMap.height });
        jqueryMap.$graph.css({ width: settingsMap.width, height: settingsMap.height });

        jqueryMap.$graphCopy.attr({ width: settingsMap.width, height: settingsMap.height });
        jqueryMap.$graphCopy.css({ width: settingsMap.width, height: settingsMap.height });

        resetContext();

        setTimeout(function () {
            resizeCanvas();
        },10);
       

        $(window)
             .on('resize', function () {
                 //jqueryMap.$graph.attr({ width: jqueryMap.$graphContainer.width(), height: jqueryMap.$graphContainer.height() });
                 //jqueryMap.$graph.css({ width: jqueryMap.$graphContainer.width(), height: jqueryMap.$graphContainer.height() });
                 //resetContext();
                 
                 resizeCanvas();
             });


        jqueryMap.$graph
            .on('click', onClick)
            .on('dblclick', onDoubleClick)
            .on('mousedown', onMouseDown)
            .on('mouseup', onMouseUp)
            .on('mousemove', onMouseMove);

        jqueryMap.$graphContainer
            .on('scroll', onScroll);


        $.gevent.subscribe($('<div/>'), 'fsm-zoom-in', onZoomIn);
        $.gevent.subscribe($('<div/>'), 'fsm-zoom-out', onZoomOut);
        $.gevent.subscribe($('<div/>'), 'fsm-export', onExport);

        $.gevent.subscribe($('<div/>'), 'fsm-nav-move', function (e, update_map) {
            jqueryMap.$graphContainer
                .scrollTop(update_map.y * jqueryMap.$graph.height())
                .scrollLeft(update_map.x * jqueryMap.$graph.width());
            stateMap.navMoved = true;
            
        });

        $.gevent.subscribe($('<div/>'), 'fsm-new', function (event) {
            stateMap.states = [];
            resetContext();
        });

        $.gevent.subscribe($('<div/>'), 'fsm-load', onGraphLoad);
        $.gevent.subscribe($('<div/>'), 'fsm-logout', function (e) {
            stateMap.states = [];
            resetContext();
        });

        $.gevent.subscribe($('<div/>'), 'fsm-print', onGraphPrint);



        $(document).on('click', function(e) {
            stateMap.hasFocus = false;
        });

        $(document).on('keydown', onKeyDown);

        $(document).on('keypress', onKeyPress);


    };
    // End PUBLIC method /initModule/

    // Begin PUBLIC method /getStates/
    getStates = function () {
        return stateMap.states;
    };
    // End PUBLIC method /getStates/

    return {
        initModule: initModule,
        getStates: getStates,
        Circle: Circle,
        Point: Point
    };
    //------------------- END PUBLIC METHODS ---------------------
}());