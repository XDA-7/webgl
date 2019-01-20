// @ts-check
// Direction: bottom-up

/**
 * @typedef {object} Coordinate
 * @property {number} x
 * @property {number} y
 */
/**
 * @typedef {object} SiteEvent
 * @property {Coordinate} point
 */
/**
 * @typedef {object} VertexEvent
 * @property {ParabolaArc[]} arcs
 * @property {Coordinate} eventPoint
 * @property {Coordinate} vertexPoint
 */
/**
 * @typedef {object} EventResult
 * @property {boolean} isSiteEvent
 * @property {SiteEvent} siteEvent
 * @property {VertexEvent} vertexEvent
 */
/**
 * @typedef {object} ActiveSite
 * @property {Coordinate} site
 * @property {ParabolaArc[]} arcs
 */
/**
 * @typedef {object} ParabolaArc
 * @property {ActiveSite} activeSite
 * @property {ParabolaArc} rightArc
 * @property {ParabolaArc} leftArc
 */
/**
 * @typedef {object} CircleResult
 * @property {Coordinate} centre
 * @property {number} radius
 */
/**
 * @typedef {object} Edge
 * @property {Coordinate} leftFace
 * @property {Coordinate} rightFace
 * @property {Coordinate} firstVertex
 * @property {Coordinate} lastVertex
 */

/**
 * @param {Coordinate} focus
 * @param {number} directrix
 * @param {number} xPos
 * @returns {number}
 */
function parabolaPointY(focus, directrix, xPos) {
    // transform all coordinates such that the focus is the origin
    // this allows for a much simpler equation and the result can be transformed back
    directrix -= focus.y
    xPos -= focus.x
    return (((directrix * directrix) - (xPos * xPos)) / (2 * directrix)) + focus.y
}

/**
 * @param {Coordinate} a
 * @param {Coordinate} b
 * @param {Coordinate} c
 * @returns {CircleResult}
 */
function circle(a, b, c) {
    // Coordinates need to be computed in a deterministic order because otherwise
    // counting errors can cause a different result to be output for the same inputs
    const sortedList = [a, b, c].sort(function(a, b) {
        if (a.y == b.y) {
            return a.x - b.x
        }
        else {
            return a.y - b.y
        }
    })
    a = sortedList[0]
    b = sortedList[1]
    c = sortedList[2]

    const mabx = (a.x + b.x) / 2
    const maby = (a.y + b.y) / 2
    const mbcx = (b.x + c.x) / 2
    const mbcy = (b.y + c.y) / 2
    let igab = 0
    let igbc = 0
    if (b.y - a.y == 0) {
        igab = Infinity
    }
    else {
        igab = (a.x - b.x) / (b.y - a.y)
    }

    if (c.y - b.y == 0) {
        igbc = Infinity
    }
    else {
        igbc = (b.x - c.x) / (c.y - b.y)
    }

    let xVal = 0
    let yVal = 0
    if (igab == Infinity) {
        xVal = mabx
        yVal = (xVal - mbcx) * igbc + mbcy
    }
    else if (igbc == Infinity) {
        xVal = mbcx
        yVal = (xVal - mabx) * igab + maby
    }
    else {
        xVal = (mabx * igab - mbcx * igbc + mbcy - maby) /
            (igab - igbc)
        yVal = (xVal - mabx) * igab + maby
    }
    const radius = Math.sqrt((a.x - xVal) * (a.x - xVal) + (a.y - yVal) * (a.y - yVal))
    return { centre: { x: xVal, y: yVal }, radius: radius }
}

/**
 * @param {Coordinate} a
 * @param {Coordinate} b
 * @param {number} xVal
 * @returns {number}
 */
function segmentY(a, b, xVal) {
    let gradient = 0
    if (b.x - a.x == 0) {
        gradient = Number.EPSILON
    }
    else {
        gradient = (b.y - a.y) / (b.x - a.x)
    }

    return (xVal - a.x) * gradient + a.y
}

/**
 * @param {Coordinate} a
 * @param {Coordinate} b
 * @param {number} yVal
 * @returns {number}
 */
function segmentX(a, b, yVal) {
    let gradient = 0
    if (b.x - a.x == 0) {
        gradient = Number.EPSILON
    }
    else {
        gradient = (b.y - a.y) / (b.x - a.x)
    }

    return (yVal - a.y) / gradient + a.x
}

/**
 * @param {Coordinate} vector
 * @returns {Coordinate}
 */
function getNormal(vector) {
    const divisor = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
    const unitVector = { x: vector.x / divisor, y: vector.y / divisor }
    return { x: unitVector.y, y: -unitVector.x }
}

/**
 * @param {Coordinate} a
 * @param {Coordinate} b
 * @param {Coordinate} point
 * @returns {number}
 */
function distanceFromPlane(a, b, point) {
    /**@type {Coordinate} */
    const normal = getNormal({ x: b.x - a.x, y: b.y - a.y })
    /**@type {Coordinate} */
    const transformedPoint = { x: point.x - a.x, y: point.y - a.y }
    return normal.x * transformedPoint.x + normal.y * transformedPoint.y
}

/**
 * @param {Coordinate} a
 * @param {Coordinate} b
 * @param {number} xVal
 * @returns {number}
 */
function bisectorY(a, b, xVal) {
    const midX = (a.x + b.x) / 2
    const midY = (a.y + b.y) / 2
    let inverseGrad = 0
    if (b.y - a.y == 0) {
        inverseGrad = Number.EPSILON
    }
    else {
        inverseGrad = (a.x - b.x) / (b.y - a.y)
    }

    return (xVal - midX) * inverseGrad + midY
}

function PriorityQueue() {
    /**@type {SiteEvent[]} */
    this.siteEvents = []
    /**@type {VertexEvent[]} */
    this.vertexEvents = []
}

/**
 * @param {Coordinate[]} values
 */
PriorityQueue.prototype.pushSiteEvents = function(values) {
    /**@type {SiteEvent[]} */
    this.siteEvents = values.map(function(element) { return { point: element } })
    this.sortSites()
}

/**
 * @param {VertexEvent[]} values
 */
PriorityQueue.prototype.pushVertexEvents = function(values) {
    this.vertexEvents = this.vertexEvents.concat(values)
    this.sortVertices()
}

/**
 * @param {VertexEvent[]} values
 */
PriorityQueue.prototype.removeVertexEvents = function(values) {
    this.vertexEvents = this.vertexEvents.filter(function(element) { return values.indexOf(element) == -1 })
    this.sortVertices()
}

/**
 * @returns {boolean}
 */
PriorityQueue.prototype.isEmpty = function() { return this.siteEvents.length == 0 && this.vertexEvents.length == 0 }

PriorityQueue.prototype.sortSites = function() {
    // sort in descending order as last element is what's popped
    this.siteEvents.sort(function(a, b) {
        if (a.point.y == b.point.y) {
            return b.point.x - a.point.x
        }
        else if (a.point.y > b.point.y) {
            return -1
        }
        else {
            return 1
        }
    })
}

PriorityQueue.prototype.sortVertices = function() {
    // sort in descending order as last element is what's popped
    this.vertexEvents.sort(function(a, b) {
        if (a.eventPoint.y == b.eventPoint.y) {
            return b.eventPoint.x - a.eventPoint.x
        }
        else {
            return b.eventPoint.y - a.eventPoint.y
        }
    })
}

/**
 * @returns {EventResult}
 */
PriorityQueue.prototype.pop = function() {
    if (this.vertexEvents.length == 0) {
        return { isSiteEvent: true, siteEvent: this.siteEvents.pop(), vertexEvent: null }
    }
    if (this.siteEvents.length == 0) {
        return { isSiteEvent: false, vertexEvent: this.vertexEvents.pop(), siteEvent: null }
    }

    const nextSiteEvent = this.siteEvents.pop()
    const nextVertexEvent = this.vertexEvents.pop()
    if (nextSiteEvent.point.y < nextVertexEvent.eventPoint.y) {
        this.vertexEvents.push(nextVertexEvent)
        return { isSiteEvent: true, siteEvent: nextSiteEvent, vertexEvent: null }
    }
    else {
        this.siteEvents.push(nextSiteEvent)
        return { isSiteEvent: false, vertexEvent: nextVertexEvent, siteEvent: null }
    }
}


/**
 * @param {Coordinate[]} sites
 */
function VoronoiDiagram(sites) {
    /**@type {ActiveSite[]} */
    this.activeSites = []
    /**@type {Edge[]} */
    this.edges = []
    this.lineSweepPosition = 0
    this.queue = new PriorityQueue()

    this.queue.pushSiteEvents(sites)
    this.insertFirstSites()
}

VoronoiDiagram.prototype.compute =  function() {
    while (!this.queue.isEmpty()) {
        this.computeStep()
    }
    
    this.completeUnboundEdges()
}

VoronoiDiagram.prototype.computeStep = function() {
    const nextEvent = this.queue.pop()
    if (nextEvent.isSiteEvent) {
        console.log('Site event')
        console.log(nextEvent.siteEvent.point)
        console.log(nextEvent.siteEvent.point.y)
        console.log()
        this.lineSweepPosition = nextEvent.siteEvent.point.y
        this.insertSite(nextEvent.siteEvent.point)
    }
    else {
        console.log('Vertex event')
        console.log(nextEvent.vertexEvent.vertexPoint)
        console.log(nextEvent.vertexEvent.arcs[0].activeSite.site)
        console.log(nextEvent.vertexEvent.arcs[1].activeSite.site)
        console.log(nextEvent.vertexEvent.arcs[2].activeSite.site)
        console.log(nextEvent.vertexEvent.eventPoint.y)
        console.log()
        this.lineSweepPosition = nextEvent.vertexEvent.eventPoint.y
        this.processVertexEvent(nextEvent.vertexEvent)
    }
}

VoronoiDiagram.prototype.insertFirstSites = function() {
    const firstSite = this.queue.pop().siteEvent.point
    const secondSite = this.queue.pop().siteEvent.point
    /**@type {ActiveSite} */
    const firstActiveSite = { site: firstSite, arcs: null }
    this.activeSites.push(firstActiveSite)
    /**@type {ActiveSite} */
    const secondActiveSite = { site: secondSite, arcs: null }
    this.activeSites.push(secondActiveSite)

    /**@type {ParabolaArc} */
    const dividingArc = { activeSite: secondActiveSite, leftArc: null, rightArc: null }
    /**@type {ParabolaArc} */
    const leftArc = { activeSite: firstActiveSite, leftArc: null, rightArc: dividingArc }
    /**@type {ParabolaArc} */
    const rightArc = { activeSite: firstActiveSite, leftArc: dividingArc, rightArc: null }
    dividingArc.leftArc = leftArc
    dividingArc.rightArc = rightArc

    secondActiveSite.arcs = [dividingArc]
    firstActiveSite.arcs = [leftArc, rightArc]
    this.edges.push({
        leftFace: firstSite,
        rightFace: secondSite,
        firstVertex: null,
        lastVertex: null
    })
}

/**
 * @param {Coordinate} site
 */
VoronoiDiagram.prototype.insertSite = function(site) {
    const self = this
    // highest y value is closest to the sweep line
    let closestParabolaYDistance = -Infinity;
    /**@type {ActiveSite} */
    let closestParabolaSite = null;
    this.activeSites.forEach(function(element) {
        const yDist = parabolaPointY(element.site, self.lineSweepPosition, site.x)
        // If the sweep line has the same yVal as the site then an invalid value of Infinity will be produced
        if (yDist != Infinity && yDist > closestParabolaYDistance) {
            closestParabolaYDistance = yDist
            closestParabolaSite = element
        }
    })

    /**@type {ParabolaArc} */
    let containingArc = null
    if (closestParabolaSite.arcs.length == 1) {
        containingArc = closestParabolaSite.arcs[0]
    }
    else {
        // If there's more than one arc on the parabola then there's another parabola subdividing it and checking the position of the related site point
        // should indicate which arc the new site falls on
        closestParabolaSite.arcs.slice(0, closestParabolaSite.arcs.length - 1).forEach(function(arc) {
            if (arc.rightArc.activeSite.site.x > site.x) {
                containingArc = arc
                return
            }
        })
        // If the end is reached without the containing arc found then it must be the last arc
        // of the parabola, with its right neighbour being the parabola that this parabola subdivides
        // or null if this is the last parabola on the beachline
        if (containingArc == null) {
            containingArc = closestParabolaSite.arcs[closestParabolaSite.arcs.length - 1]
            if (closestParabolaSite.arcs.length == 0) {
                console.log('parabola site')
                console.log(closestParabolaSite.site)
                console.log()
            }
        }
    }

    /**@type {ActiveSite} */
    const activeSite = { site: site, arcs: null }
    this.activeSites.push(activeSite)
    activeSite.arcs = [{ activeSite: activeSite, leftArc: null, rightArc: null }]
    this.updateBeachLine(activeSite.arcs[0], containingArc)
    
    closestParabolaSite.arcs.sort(function(a, b) {
        if (a.rightArc == null) {
            return 1
        }
        else if (b.rightArc == null) {
            return -1
        }
        else {
            return a.rightArc.activeSite.site.x - b.rightArc.activeSite.site.x
        }
    })
}

/**
 * @param {ParabolaArc} newArc
 * @param {ParabolaArc} intersectedArc
 */
VoronoiDiagram.prototype.updateBeachLine = function(newArc, intersectedArc) {
    intersectedArc.activeSite.arcs = intersectedArc.activeSite.arcs.filter(function(element) { return element != intersectedArc })
    const intersectedArcLeftArc = intersectedArc.leftArc
    const intersectedArcRightArc = intersectedArc.rightArc
    // Create a triple of the new arc and the divided intercepted arc
    newArc.leftArc = { activeSite: intersectedArc.activeSite, leftArc: intersectedArcLeftArc, rightArc: newArc }
    newArc.rightArc = { activeSite: intersectedArc.activeSite, leftArc: newArc, rightArc: intersectedArcRightArc }
    intersectedArc.activeSite.arcs.push(newArc.leftArc)
    intersectedArc.activeSite.arcs.push(newArc.rightArc)
    if (intersectedArcLeftArc != null) {
        intersectedArcLeftArc.rightArc = newArc.leftArc
    }
    
    if (intersectedArcRightArc != null) {
        intersectedArcRightArc.leftArc = newArc.rightArc
    }
    
    this.edges.push({
        leftFace: newArc.activeSite.site,
        rightFace: intersectedArc.activeSite.site,
        firstVertex: null,
        lastVertex: null
    })
    this.removeArcTriples(intersectedArc)
    this.updateVertexEventsForNewSite(newArc)
}

/**
 * @param {ParabolaArc} arc
 */
VoronoiDiagram.prototype.removeArcTriples = function(arc) {
    const deadEvents = this.queue.vertexEvents.filter(function(element) {
        return element.arcs[0] == arc || element.arcs[1] == arc || element.arcs[2] == arc
    })
    this.queue.removeVertexEvents(deadEvents)
}

/**
 * @param {ParabolaArc} arc
 */
VoronoiDiagram.prototype.updateVertexEventsForNewSite = function(arc) {
    /**@type {VertexEvent[]} */
    const vertexEvents = []
    if (arc.leftArc.leftArc != null) {
        vertexEvents.push(this.getVertexEvent(arc.leftArc))
        if (arc.leftArc.leftArc.leftArc != null) {
            vertexEvents.push(this.getVertexEvent(arc.leftArc.leftArc))
        }
    }

    if (arc.rightArc.rightArc != null) {
        vertexEvents.push(this.getVertexEvent(arc.rightArc))
        if (arc.rightArc.rightArc.rightArc != null) {
            vertexEvents.push(this.getVertexEvent(arc.rightArc.rightArc))
        }
    }

    this.queue.pushVertexEvents(vertexEvents.filter(function(element) { return element != null }))
}

/**
 * @param {ParabolaArc} arc
 * @returns {VertexEvent}
 */
VoronoiDiagram.prototype.getVertexEvent = function(arc) {
    const leftSite = arc.leftArc.activeSite.site
    const middleSite = arc.activeSite.site
    const rightSite = arc.rightArc.activeSite.site
    if (leftSite == middleSite || middleSite == rightSite || leftSite == rightSite) {
        return null
    }

    if (leftSite.x > rightSite.x) {
        return null
    }

    const circleResult = circle(leftSite, middleSite, rightSite)
    if (circleResult.centre.x == Infinity || circleResult.centre.y == Infinity) {
        return null
    }

    const eventY = circleResult.centre.y + circleResult.radius
    if (eventY < this.lineSweepPosition) {
        return null
    }

    // if (!this.canAddVertexToEdge(leftSite, middleSite, circleResult.centre) ||
    //     !this.canAddVertexToEdge(middleSite, rightSite, circleResult.centre)) {
    //     return null
    // }

    /**@type {Coordinate} */
    const eventPoint = { x: circleResult.centre.x, y: eventY }
    return {
        arcs: [arc.leftArc, arc, arc.rightArc],
        eventPoint: eventPoint,
        vertexPoint: circleResult.centre
    }
}

/**
 * @param {VertexEvent} vertexEvent
 */
VoronoiDiagram.prototype.processVertexEvent = function(vertexEvent) {
    const deletedArc = vertexEvent.arcs[1]
    deletedArc.activeSite.arcs = deletedArc.activeSite.arcs.filter(function(arc) { return arc != deletedArc })
    const leftSite = vertexEvent.arcs[0]
    const rightSite = vertexEvent.arcs[2]
    leftSite.rightArc = vertexEvent.arcs[2]
    rightSite.leftArc = vertexEvent.arcs[0]
    this.removeArcTriples(deletedArc)
    /**@type {Edge} */
    const edge = { 
        leftFace: leftSite.activeSite.site,
        rightFace: rightSite.activeSite.site,
        firstVertex: null,
        lastVertex: null
    }
    this.addVertexToEdge(edge, vertexEvent.vertexPoint)
    this.edges.push(edge)
    this.updateEdge(
        leftSite.activeSite.site,
        deletedArc.activeSite.site,
        vertexEvent.vertexPoint
    )
    this.updateEdge(
        deletedArc.activeSite.site,
        rightSite.activeSite.site,
        vertexEvent.vertexPoint
    )
}

/**
 * @param {Coordinate} leftArc
 * @param {Coordinate} rightArc
 * @param {Coordinate} vertex
 */
VoronoiDiagram.prototype.updateEdge = function(leftArc, rightArc, vertex) {
    const edge = this.getEdge(leftArc, rightArc)
    this.addVertexToEdge(edge, vertex)
}

/**
 * @param {Edge} edge
 * @param {Coordinate} vertex
 */
VoronoiDiagram.prototype.addVertexToEdge = function(edge, vertex) {
    if (distanceFromPlane(edge.leftFace, edge.rightFace, vertex) > 0) {
        if (edge.firstVertex != null) {
            console.log('vertex addition error')
        }
        edge.firstVertex = vertex
    }
    else {
        if (edge.lastVertex != null) {
            console.log('vertex addition error')
        }
        edge.lastVertex = vertex
    }
}

/**
 * @param {Coordinate} leftFace
 * @param {Coordinate} rightFace
 * @param {Coordinate} vertex
 * @returns {boolean}
 */
VoronoiDiagram.prototype.canAddVertexToEdge = function(leftFace, rightFace, vertex) {
    const edge = this.getEdge(leftFace, rightFace)
    if (!edge) {
        return true
    }

    if (distanceFromPlane(edge.leftFace, edge.rightFace, vertex) > 0) {
        return edge.firstVertex == null
    }
    else {
        return edge.lastVertex == null
    }
}

/**
 * @param {Coordinate} a
 * @param {Coordinate} b
 * @returns {Edge}
 */
VoronoiDiagram.prototype.getEdge = function(a, b) {
    return this.edges.find(function(element) {
        return (element.leftFace == a && element.rightFace == b) ||
        (element.leftFace == b && element.rightFace == a)
    })
}

VoronoiDiagram.prototype.completeUnboundEdges = function() {
    this.edges.forEach(function(edge) {
        if (edge.firstVertex == null && edge.lastVertex == null) {
            console.log('edge without vertex')
            console.log(edge)
            console.log()
            return
        }

        const midpointX = (edge.leftFace.x + edge.rightFace.x) / 2
        if (edge.firstVertex == null) {
            const direction = midpointX - edge.lastVertex.x
            if (direction > 0) {
                edge.firstVertex = {
                    x: 100,
                    y: bisectorY(edge.leftFace, edge.rightFace, 100)
                }
            }
            else {
                edge.firstVertex = {
                    x: -100,
                    y: bisectorY(edge.leftFace, edge.rightFace, -100)
                }
            }
        }
        else if (edge.lastVertex == null) {
            const direction = midpointX - edge.firstVertex.x
            if (direction > 0) {
                edge.lastVertex = {
                    x: 100,
                    y: bisectorY(edge.leftFace, edge.rightFace, 100)
                }
            }
            else {
                edge.lastVertex = {
                    x: -100,
                    y: bisectorY(edge.leftFace, edge.rightFace, -100)
                }
            }
        }
    })
}

/**
 * @param {ParabolaArc} randomArc
 */
function logBeachLine(randomArc) {
    let currentArc = randomArc
    let traversals = 0
    while (currentArc.leftArc != null) {
        currentArc = currentArc.leftArc
        traversals++
    }

    console.log('beachline start, ' + traversals + ' traversals')
    while(currentArc != null) {
        console.log(currentArc.activeSite.site)
        currentArc = currentArc.rightArc
    }
}

/**
 * @param {ParabolaArc} randomArc
 */
function reverseLogBeachLine(randomArc) {
    let currentArc = randomArc
    let traversals = 0
    while (currentArc.rightArc != null) {
        currentArc = currentArc.rightArc
        traversals++
    }

    console.log('reverse beachline start, ' + traversals + ' traversals')
    while(currentArc != null) {
        console.log(currentArc.activeSite.site)
        currentArc = currentArc.leftArc
    }
}

/**
 * @param {VoronoiDiagram} diagram
 */
function logEdges(diagram) {
    diagram.edges.forEach(function(element) {
        console.log(element)
    })
}

/**
 * @returns {CanvasRenderingContext2D}
 */
function getCanvas() {
    const existingElement = document.getElementById('canvas')
    if (existingElement) {
        document.body.removeChild(existingElement)
    }

    const canvasElement = document.createElement('canvas')
    canvasElement.id = 'canvas'
    document.body.appendChild(canvasElement)
    canvasElement.width = 10000
    canvasElement.height = 10000
    return canvasElement.getContext('2d')
}

/**
 * @param {VoronoiDiagram} diagram
 */
function drawBeachLine(diagram) {
    let currentArc = diagram.activeSites[0].arcs[0]
    while (currentArc.leftArc != null) {
        currentArc = currentArc.leftArc
    }

    const canvas = getCanvas()
    const correctedSweepLine = correctedCoordinate({ x: 0, y: diagram.lineSweepPosition }).y
    while (currentArc != null) {
        const correctedSite = correctedCoordinate(currentArc.activeSite.site)
        const radius = correctedSite.y - correctedSweepLine
        const x = correctedSite.x
        const y = correctedSite.y
        canvas.beginPath()
        canvas.arc(x, y, radius / 2, 0, Math.PI * 2)
        canvas.stroke()
        currentArc = currentArc.rightArc
    }
}

/**
 * @param {VoronoiDiagram} diagram
 */
function drawDiagramToCanvas(diagram) {
    const canvas = getCanvas()
    diagram.edges.forEach(function(element) {
        if (element.firstVertex != null && element.lastVertex != null) {
            drawLine(canvas, element.firstVertex, element.lastVertex)
        }
        else if (element.firstVertex != null) {
            drawPoint(canvas, element.firstVertex, false)
        }
        else if (element.lastVertex != null) {
            drawPoint(canvas, element.lastVertex, false)
        }
        drawPoint(canvas, element.leftFace, true)
        drawPoint(canvas, element.rightFace, true)
    })
}

/**
 * @param {CanvasRenderingContext2D} canvas
 * @param {Coordinate} point
 * @param {boolean} fill
 */
function drawPoint(canvas, point, fill) {
    const size = 10.0
    const correctedPoint = correctedCoordinate(point)
    const x = correctedPoint.x - size / 2
    const y = correctedPoint.y - size / 2
    if (fill) {
        canvas.fillRect(x, y, size, size)
    }
    else {
        canvas.strokeRect(x, y, size, size)
    }
}

/**
 * @param {CanvasRenderingContext2D} canvas
 * @param {Coordinate} start
 * @param {Coordinate} end
 */
function drawLine(canvas, start, end) {
    const correctedStart = correctedCoordinate(start)
    const correctedEnd = correctedCoordinate(end)
    canvas.beginPath()
    canvas.moveTo(correctedStart.x, correctedStart.y)
    canvas.lineTo(correctedEnd.x, correctedEnd.y)
    canvas.stroke()
}

/**
 * @param {Coordinate} coord
 * @returns {Coordinate}
 */
function correctedCoordinate(coord) {
    const x = coord.x * 25 + 500
    const y = -coord.y * 25 + 500
    return { x: x, y: y }
}

/**@type {Coordinate[]} */
const sites = []
for (var i = 0; i < 10; i++) {
    sites.push({ x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) })
}

const diagram = new VoronoiDiagram([
    { x: 3, y: 3 },
    { x: 12, y: 3 },
    { x: 8, y: 5 },
    { x: 10, y: 5 }
])
logBeachLine(diagram.activeSites[0].arcs[0])

function logAllArcs() {
    for (let i = 0; i < diagram.activeSites.length; i++) {
        console.log()
        console.log(diagram.activeSites[i].site)
        for (let j = 0; j < diagram.activeSites[i].arcs.length; j++) {
            console.log(diagram.activeSites[i].arcs[j])
            logBeachLine(diagram.activeSites[i].arcs[j])
            reverseLogBeachLine(diagram.activeSites[i].arcs[j])
        }
    }
}

/**
 * @param {VoronoiDiagram} diagram
 */
function logVertexEvents(diagram) {
    console.log('vertex triples')
    diagram.queue.vertexEvents.forEach(function(element) {
        console.log(element.arcs[0].activeSite.site)
        console.log(element.arcs[1].activeSite.site)
        console.log(element.arcs[2].activeSite.site)
        console.log()
        console.log(element.vertexPoint)
        console.log(element.eventPoint)
        console.log()
    })
}

// logEdges(diagram)

while (!diagram.queue.isEmpty()) {
    diagram.computeStep()
    // console.log(diagram.lineSweepPosition)
    logBeachLine(diagram.activeSites[0].arcs[0])
    logVertexEvents(diagram)
    // logAllArcs()
}

diagram.completeUnboundEdges()
// diagram.compute()

logEdges(diagram)
console.log(sites)
// drawBeachLine(diagram)
drawDiagramToCanvas(diagram)