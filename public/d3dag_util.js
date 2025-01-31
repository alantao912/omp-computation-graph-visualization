// set the layout functions
const nodeRadius = 12;
const nodeSize = [nodeRadius * 2, nodeRadius * 2];

const ompt_device_mem_flag_t = Object.freeze({ 
  to:             0x01,
  from:           0x02,
  alloc:          0x04,
  release:        0x08,
  associate:      0x10,
  disassociate:   0x20
}); 

const event_type = Object.freeze({
  parallel_begin:       0,
  parallel_end:         1,
  implicit_task:        2,
  sync_region_begin:    3,
  sync_region_end:      4,
  task_create:          5,
  target_begin:         6,
  target_end:           7,
  taskwait_end:         8,
  taskgroup_begin:      9,
  taskgroup_end:        10,
  task_schedule:         11
})

const edge_type = Object.freeze({
  CONT:     0,
  FORK_I:   1,
  FORK_E:   2,
  JOIN:     3,
  JOIN_E:   4,
  BARRIER:  5,
  TARGET:   6
})

function get_move_type(flag) {
  // notice a flag can contain several types
  let type = "";
  if (flag & ompt_device_mem_flag_t.to) {
    type = type + "to | ";
  }

  if (flag & ompt_device_mem_flag_t.from) {
    type = type + "from | ";
  }

  if (flag & ompt_device_mem_flag_t.alloc){
    type = type + "alloc | ";
  }

  if (flag & ompt_device_mem_flag_t.release){
    type = type + "release | ";
  }

  if (flag & ompt_device_mem_flag_t.associate){
    type = type + "associate | ";
  }

  if (flag & ompt_device_mem_flag_t.disassociate){
    type = type + "disassociate | ";
  }
  return type;
}

function getDataMovementDescriptionString(data) {
  if (data.flag & ompt_device_mem_flag_t.to) {
    return `To: ${data.bytes} bytes`;
  }

  if (data.flag & ompt_device_mem_flag_t.from) {
    return  `From: ${data.bytes} bytes`;
  }

  if (data.flag & ompt_device_mem_flag_t.alloc){
    return `Alloc: ${data.bytes} bytes`;
  }

  if (data.flag & ompt_device_mem_flag_t.release){
    return  `Release: ${data.bytes} bytes`;
  }

  if (data.flag & ompt_device_mem_flag_t.associate){
    return "Associate";
  }

  if (data.flag & ompt_device_mem_flag_t.disassociate){
    return "Disassociate";
  }
  return "";
}

function shouldShowOnBeginNode(flag)
{
  return ((flag & ompt_device_mem_flag_t.to) | (flag & ompt_device_mem_flag_t.alloc) | (flag & ompt_device_mem_flag_t.associate)) !== 0;
}

function shouldShowOnEndNode(flag)
{
  return ((flag & ompt_device_mem_flag_t.from) | (flag & ompt_device_mem_flag_t.release) | (flag & ompt_device_mem_flag_t.disassociate)) !== 0;
}

function isFromDataMovement(flag)
{
  return (flag & ompt_device_mem_flag_t.from) !== 0;
}

function isToDataMovement(flag)
{
  return (flag & ompt_device_mem_flag_t.to) !== 0;
}

function isAllocDataMovement(flag)
{
  return (flag & ompt_device_mem_flag_t.alloc) !== 0;
}

function isReleaseDataMovement(flag)
{
  return (flag & ompt_device_mem_flag_t.release) !== 0;
}

function isAssociateDataMovement(flag)
{
  return !((flag & ompt_device_mem_flag_t.associate) === 0);
}

function isDisassociateDataMovement(flag)
{
  return (flag & ompt_device_mem_flag_t.disassociate) !== 0;
}

function numberOfFlagTypes(flag)
{
  let num = 0;
  if ((flag & ompt_device_mem_flag_t.to) || (flag & ompt_device_mem_flag_t.from)) {
    num += 1;
  }

  if ((flag & ompt_device_mem_flag_t.associate) || (flag & ompt_device_mem_flag_t.disassociate)){
    num += 1;
  }
  return num;
}


function get_event_string(type){
  switch(type){
    case event_type.parallel_begin:
      return "parallel_begin"
    case event_type.parallel_end:
      return "parallel_end"
    case event_type.implicit_task:
      return "implicit_task"
    case event_type.sync_region_begin:
      return "sync_region_begin"
    case event_type.sync_region_end:
      return "sync_region_end"
    case event_type.task_create:
      return "task_create"
    case event_type.target_begin:
      return "target_begin"
    case event_type.target_end:
      return "target_end"
    case event_type.taskwait_end:
      return "taskwait_end"
    case event_type.taskgroup_begin:
      return "taskgroup_begin"
    case event_type.taskgroup_end:
      return "taskgroup_end"
    case event_type.task_schedule:
      return "task_schedule"
    default:
      return "unknown"
  }
}

function get_edge_type_string(e){
  switch(get_edge_type(e)){
    case edge_type.CONT:
      return "CONT"
    case edge_type.FORK_I:
      return "FORK_I"
    case edge_type.FORK_E:
      return "FORK_E"
    case edge_type.JOIN:
      return "JOIN"
    case edge_type.JOIN_E:
      return "JOIN_E"
    case edge_type.BARRIER:
      return "BARRIER"
    case edge_type.TARGET:
      return "TARGET"
    default:
      return "unknown"
  }
}

function get_edge_dash(e) {
  if (e.data === undefined) {
    return "0"
  }

  if (e.data.edge_type === edge_type.FORK_I || e.data.edge_type === edge_type.FORK_E) {
    return "4"
  }

  if(e.data.edge_type === edge_type.JOIN || e.data.edge_type === edge_type.JOIN_E || e.data.edge_type === edge_type.BARRIER) {
    return "1,4"
  }

  if (e.data.edge_type === edge_type.TARGET) {
    return "20, 10";
  }
}


function get_edge_color(e) {
  if (e.data != undefined && e.data.edge_type === edge_type.TARGET) {
    return "pink";
  }
  return "black";
}


function get_edge_width(e) {
  return 2;
}


function get_edge_type(e) {
  if (e.data != undefined)
  {
    return e.data.edge_type;
  }
  return undefined;
}


function get_node_color(n) {
  if (n.data.has_race === undefined) {
    return "pink";
  }

  if (!n.data.active && !n.data.has_race) {
    return "#858585";
  }

  if (n.data.has_race == true) {
    if(n.data.special == true){
      return "red"
    }
    return "#870404";
  }

  if(n.data.ontarget != undefined && n.data.ontarget == true) {
    /* Blue color for nodes on target device */
    return "#799CEF";
  }
  /* Default node color */
  return "#F6D42A";
}


function get_node_opacity(n) {
  if (n.data.hidden) {
    return 0;
  }
  return 1;
}

function get_node_id(n) {
  if (n.data != undefined && n.data.id != undefined) {
    return n.data.id;
  }
  return undefined;
}

function get_edge_opacity(e) {
  if (e.data === undefined) {
    e.data = new Object();
    e.data.hidden = false;
    return "1";
  }
  if (e.data.hidden) {
    return "0";
  }
  return "1";
}


let data = [
  {
    id: "0",
    active: true,
    hidden: false,
    parentIds: []
  },
  {
    id: "1",
    active: true,
    hidden: false,
    parentIds: ["0"]
  },
  {
    id: "2",
    active: true,
    hidden: false,
    parentIds: ["0"]
  },
  {
    id: "3",
    active: true,
    hidden: false,
    parentIds: ["1"]
  },
  {
    id: "4",
    active: true,
    hidden: false,
    parentIds: ["1"]
  },
  {
    id: "5",
    active: true,
    hidden: false,
    parentIds: ["2"]
  },
  {
    id: "6",
    active: true,
    hidden: false,
    parentIds: ["2"]
  }
];