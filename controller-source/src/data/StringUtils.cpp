#include <Arduino.h>
#include "StringUtils.h"

String StringUtils::zeroPad(double valueToZeroPad) {
  String RPMToReturn = String(valueToZeroPad);

  if (RPMToReturn.length() == 4) {
    int indexOfSeparator = RPMToReturn.indexOf(".");
    if (indexOfSeparator == 1) {
      return "0" + RPMToReturn;
    } else if (indexOfSeparator == 2) {
      return RPMToReturn + "0";
    }
  }

  return RPMToReturn;
}
