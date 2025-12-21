import moment from "moment";

export const formatDate = (date: string | Date | null | undefined) => {
  if (!date) {
    return "-";
  }
  return moment(date).format("MM/DD/YYYY");
};
