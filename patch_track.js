const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/HomeClient.tsx', 'utf8');

const targetOriginDest = `                                  <div className="flex items-center gap-1.5 text-sm font-semibold text-[#00342b] mt-1">
                                    <span>{origin}</span>
                                    <span className="text-[#00affe] material-symbols-outlined text-[14px]">arrow_forward</span>
                                    <span>{dest}</span>
                                  </div>`;

const targetFooter = `                              <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs text-[#3f4945]">
                                <div className="flex items-center gap-1 font-medium">
                                  <span className="material-symbols-outlined text-[14px] text-[#006493]">schedule</span>
                                  <span>Departs: <strong className="text-[#00342b]">{depTimeStr}</strong></span>
                                </div>
                                <div className={\`font-medium \${schedule.available_seats > 0 ? 'text-green-700' : 'text-rose-600'}\`}>
                                  {schedule.available_seats > 0 ? \`\${schedule.available_seats} seats free\` : 'Bus Full (Tracking Open)'}
                                </div>
                              </div>`;

const arrTimeStr = `new Date(schedule.arrival_time).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                  timeZone: 'Asia/Kolkata'
                                })`;

const newPathRender = `                                  <div className="w-full mt-3 flex flex-wrap items-center gap-1.5 p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                                    {(() => {
                                      let allStops = [];
                                      if (schedule.station_times && schedule.station_times.length > 0) {
                                        allStops = schedule.station_times;
                                      } else {
                                        const stops = schedule.routes?.route_stops || [];
                                        allStops = [
                                          { name: origin, time: depTimeStr },
                                          ...stops.sort((a,b) => a.stop_order - b.stop_order).map(s => ({ name: s.location?.name || s.custom_name || 'Stop', time: '--:--' })),
                                          { name: dest, time: !isNaN(new Date(schedule.arrival_time).getTime()) ? ${arrTimeStr} : schedule.arrival_time }
                                        ];
                                      }

                                      return allStops.map((st, idx) => (
                                        <React.Fragment key={idx}>
                                          <div className="flex flex-col items-center min-w-[40px]">
                                            <span className="text-[11px] font-bold text-[#00342b] leading-tight text-center">{st.name}</span>
                                            <span className="text-[9px] font-bold text-[#006493]">{st.time}</span>
                                          </div>
                                          {idx < allStops.length - 1 && (
                                            <span className="material-symbols-outlined text-[14px] text-[#00affe]/50 -mt-2">arrow_forward</span>
                                          )}
                                        </React.Fragment>
                                      ));
                                    })()}
                                  </div>`;

code = code.replace(targetOriginDest, newPathRender);
code = code.replace(targetFooter, '');

fs.writeFileSync('frontend/src/app/HomeClient.tsx', code);
