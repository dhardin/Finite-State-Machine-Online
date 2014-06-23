// JavaScript source code
fsm.math_util = (function () {
    'use strict';

    var
        circleFrom3Points, isPointInPath, pointDistanceAway, getIntersectionBetweenTwoLines,
        getineCircleIntersections, getDistance
    ;
    //---------------- BEGIN MODULE SCOPE VARIABLES --------------
    circleFrom3Points = function (x1, y1, x2, y2, x3, y3) {
        //create circle from 3 points
        /*
        http://randomfox.livejournal.com/13598.html
         */

        var temp = x2 * x2 + y2 * y2;
        var bc = (x1 * x1 + y1 * y1 - temp) / 2.;
        var cd = (temp - x3 * x3 - y3 * y3) / 2.;
        var det = (x1 - x2) * (y2 - y3) - (x2 - x3) * (y1 - y2);

        if (Math.abs(det) < 1e-14)
            return false;

        var circ = new Array(
        (bc * (y2 - y3) - cd * (y1 - y2)) / det,
        ((x1 - x2) * cd - (x2 - x3) * bc) / det
        );


        return new fsm.graph.Circle(circ[0], circ[1], getDistance(circ[0], circ[1], x1, y1), 'black', 'white', false);
    };

    isPointInPath = function (x, y) {
        var pointSlope,
         fluff = 10,
         pointToCirlce;

        //check that point is not inside states
        if (this.startState.isPointInPath(context, x, y)) {
            return false;
        } else if (this.endState.isPointInPath(context, x, y)) {
            return false;
        } else if (this.startState != this.endState) {
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
        } else {
            //check to see if x and y are located inside
            //self transition (represented by Circle object)
            if (this.selfState.isPointInPath(context, x, y)) {
                return true;
            } else {
                return false;
            }
        }
    };
    //Begin Utility Method /getDistance/
    getDistance = function (x1, y1, x2, y2) {
        var distance = Math.sqrt(
                    Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
                );
        return distance;
    };
    // End Utility Method /getDistance/
    pointDistanceAway = function (startX, startY, distance, slope, direction) {
        var point = new fsm.graph.Point();
        // A = central point
        // t = distance
        // N = normalized vector
        // f(t) = equation for your line in parameterized format
        //magnitude = (1^2 + m^2)^(1/2)
        //N = <1, m> / magnitude = <1 / magnitude, m / magnitude>
        //f(t) = A + t * N  //vector addition and vector multiplication
        direction = direction || 1;
        var t = distance * direction;
        var magnitude = Math.pow(Math.pow(1 + slope, 2), 0.5);

        var N = new fsm.graph.Point(1 / magnitude, slope / magnitude);

        N.x = N.x * t;
        N.y = N.y * t;

        point.x = startX + N.x;
        point.y = startY + N.y;

        return point;
    };

    getIntersectionBetweenTwoLines = function (m1, b1, m2, b2) {
        var intersection = new fsm.graph.Point(0, 0);



        //update intersection point (this is the intersection point between our two lines)
        this.intersection.x = -1 * (b1 - b2) / (this.slope - invertedSlope);
        this.intersection.y = invertedSlope * this.controlPoint.x + b2;

        return 

        //return false if no intersection

    };

    // Find the points of intersection.
    getineCircleIntersections = function( cx,  cy,  radius, point1,  point2)
    {
        var dx, dy, A, B, C, det, t, intersection1, intersection2;

        dx = point2.x - point1.x;
        dy = point2.y - point1.y;

        A = dx * dx + dy * dy;
        B = 2 * (dx * (point1.x - cx) + dy * (point1.y - cy));
        C = (point1.x - cx) * (point1.x - cx) + (point1.y - cy) * (point1.y - cy) - radius * radius;

        det = B * B - 4 * A * C;

        if ((A <= 0.0000001) || (det < 0))
        {
            // No real solutions.
            intersection1 = false;
            intersection2 = false;
        }
        else if (det == 0)
        {
            // One solution.
            t = -B / (2 * A);
            intersection1 = new fsm.graph.Point(point1.x + t * dx, point1.y + t * dy);
            intersection2 = false;
        }
        else
        {
            // Two solutions.
            t =((-B + Math.sqrt(det)) / (2 * A));
            intersection1 = new fsm.graph.Point(point1.x + t * dx, point1.y + t * dy);
            t = ((-B - Math.sqrt(det)) / (2 * A));
            intersection2 = new fsm.graph.Point(point1.x + t * dx, point1.y + t * dy);
        }

        return {
            intersection1: intersection1,
            intersection2: intersection2
        }
    };
    //---------------- END PUBLIC METHODS ------------------------
    // Export methods
    return {
        circleFrom3Points             : circleFrom3Points,
        isPointInPath                 : isPointInPath,
        pointDistanceAway             : pointDistanceAway,
        getIntersectionBetweenTwoLines: getIntersectionBetweenTwoLines,
        getineCircleIntersections     : getineCircleIntersections,
        getDistance                   : getDistance
    };
})();