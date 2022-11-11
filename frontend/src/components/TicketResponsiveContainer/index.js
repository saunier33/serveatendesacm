import React from "react";
import withWidth, { isWidthUp } from "@material-ui/core/withWidth";

import Ticket from "../../pages/TicketsCustom";
import TicketAdvanced from "../../pages/TicketsAdvanced";

function TicketResponsiveContainer(props) {
  if (isWidthUp("md", props.width)) {
    return <Ticket />;
  }
  return <TicketAdvanced />;
}

export default withWidth()(TicketResponsiveContainer);
