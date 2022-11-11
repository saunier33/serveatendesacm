import { useState, useEffect } from "react";
import toastError from "../../errors/toastError";

import api from "../../services/api";

const useTickets = ({
  searchParam,
  pageNumber,
  tags,
  status,
  date,
  updatedAt,
  showAll,
  queueIds,
  withUnreadMessages,
}) => {
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchTickets = async () => {
        try {
          const { data } = await api.get("/tickets", {
            params: {
              searchParam,
              tags,
              pageNumber,
              status,
              date,
              updatedAt,
              showAll,
              queueIds,
              withUnreadMessages,
            },
          });
          setTickets(data.tickets);
          setHasMore(data.hasMore);
          setCount(data.count);
          setLoading(false);
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchTickets();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [
    searchParam,
    pageNumber,
    status,
    tags,
    date,
    updatedAt,
    showAll,
    queueIds,
    withUnreadMessages,
  ]);

  return { tickets, loading, hasMore, count };
};

export default useTickets;
