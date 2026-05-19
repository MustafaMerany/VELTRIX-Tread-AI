// VELTRIX TREAD AI - MT5 Bridge Skeleton
// This is a starter Expert Advisor. Use on DEMO first.
// It polls the backend for allowed commands. Live execution is disabled in backend unless ENABLE_LIVE_TRADING=true.

#property strict
#include <Trade/Trade.mqh>
CTrade trade;

input string BackendUrl = "http://127.0.0.1:8080/api/trading/bridge/poll";
input string BridgeToken = "PUT_BRIDGE_TOKEN_HERE";
input string LoginId = "PUT_MT_LOGIN_ID_HERE";
input double DemoBalanceUsd = 1000.0;
input int PollSeconds = 30;

int OnInit() {
   EventSetTimer(PollSeconds);
   Print("VELTRIX Bridge initialized. Demo first. Do not use real funds until fully audited.");
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) {
   EventKillTimer();
}

void OnTimer() {
   string payload = StringFormat("{\"loginId\":\"%s\",\"balanceUsd\":%.2f,\"openTradesToday\":0,\"dailyLossPct\":0,\"newsHighImpact\":false}", LoginId, AccountInfoDouble(ACCOUNT_BALANCE));
   string headers = "Content-Type: application/json\r\nx-bridge-token: " + BridgeToken + "\r\n";
   char data[];
   StringToCharArray(payload, data, 0, WHOLE_ARRAY, CP_UTF8);
   char result[];
   string resultHeaders;
   ResetLastError();
   int code = WebRequest("POST", BackendUrl, headers, 10000, data, result, resultHeaders);
   if(code == -1) {
      Print("WebRequest failed: ", GetLastError(), ". Add backend URL to MT5 allowed WebRequest list.");
      return;
   }
   string body = CharArrayToString(result, 0, -1, CP_UTF8);
   Print("VELTRIX Backend Response: ", body);

   // Production implementation should parse JSON and execute only validated commands.
   // Keep this skeleton non-executing until risk, symbol mapping, lot calculation, and broker rules are audited.
}
