/**
 * Tactical coaching content for the map briefing UI.
 *
 * The identifiers deliberately stay separate from the display copy: `lotus`
 * and `dark` are the two map ids understood by the training runtime, while
 * every location, route, and exercise below is original coaching content.
 */

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}

const angle = (id, title, direction, cue, focus) => ({ id, title, direction, cue, focus });
const scenario = (id, title, description, skills, angles, recommendation) => ({
  id, title, description, skills, angles, recommendation,
});

export const SCENARIO_MAPS = freeze({
  lotus: {
    id: 'lotus',
    name: 'Lotus',
    shortName: 'LOTUS',
    description: 'Một khu đền mở với lối đi cao, sân nước nông và nhiều góc cắt ngắn.',
    zones: [
      {
        id: 'sun-steps',
        name: 'Sun Steps',
        description: 'Bậc đá rộng dẫn vào sân chính; ưu tiên tâm ngang đầu trước khi lộ người.',
        scenarios: [
          scenario('split-entry', 'Split entry', 'Mở hai hướng liên tiếp từ chân bậc rồi dừng tâm ở cửa hẹp.', ['crosshair-placement', 'first-shot', 'angle-isolation'], [
            angle('left-arch', 'Left arch', 'left', 'Dừng ở mép vòm trước khi quét sâu.', 'Đặt tâm ngay cạnh góc, không kéo qua giữa sân.'),
            angle('upper-ledge', 'Upper ledge', 'high-right', 'Kiểm tra cao độ sau khi vòm đã sạch.', 'Đổi cao độ bằng một chuyển động ngắn, có chủ đích.'),
          ], 'Dành cho người muốn ổn định phát đầu ở các góc gần.'),
          scenario('retake-lane', 'Retake lane', 'Tiến lại sân theo lane giữa, xử lý một góc sâu sau một góc nông.', ['target-transfer', 'pathing', 'micro-correction'], [
            angle('stone-post', 'Stone post', 'right', 'Lấy cột đá trước để giảm góc phải xử lý.', 'Flick ngắn từ cột sang cửa sau.'),
            angle('back-door', 'Back door', 'far-left', 'Giữ khoảng cách với tường để nhìn đủ cửa sâu.', 'Chờ tâm ổn định trước phát đầu.'),
          ], 'Phù hợp sau khi bạn đã giữ được accuracy ổn định ở bài Split entry.'),
        ],
      },
      {
        id: 'water-court',
        name: 'Water Court',
        description: 'Sân thấp có mặt nước và hai cửa đối diện, buộc người tập đổi mục tiêu ngang.',
        scenarios: [
          scenario('cross-court', 'Cross-court sweep', 'Quét ngang từ bờ trong sang bờ ngoài với hai cửa có chiều sâu khác nhau.', ['wide-flick', 'target-transfer', 'timing'], [
            angle('shallow-gate', 'Shallow gate', 'left', 'Ưu tiên cửa gần để loại bỏ góc bất ngờ.', 'Bắn một phát có kiểm soát rồi chuyển hướng.'),
            angle('far-bridge', 'Far bridge', 'right', 'Canh tâm ở mép cầu trước khi đổi sang phải.', 'Giữ tâm ngang đầu suốt chuyển động.'),
          ], 'Tốt cho luyện chuyển góc rộng mà vẫn giữ nhịp bắn chậm.'),
          scenario('waterline-hold', 'Waterline hold', 'Giữ một lane dài, phản ứng với peek ngắn từ hai vật che.', ['hold-discipline', 'reaction', 'burst-control'], [
            angle('reed-cover', 'Reed cover', 'left', 'Đặt tâm ở điểm đối thủ phải lộ vai trước.', 'Không đuổi tâm khi chưa có thân mục tiêu.'),
            angle('far-plinth', 'Far plinth', 'right', 'Điều chỉnh vài pixel khi mục tiêu lộ từ xa.', 'Ưu tiên burst ngắn và reset tâm.'),
          ], 'Dùng để luyện kiên nhẫn giữ góc và phản ứng sạch.'),
        ],
      },
      {
        id: 'canopy-walk',
        name: 'Canopy Walk',
        description: 'Lối đi trên cao với lan can thấp; độ cao mục tiêu thay đổi theo từng bước tiến.',
        scenarios: [
          scenario('elevation-clear', 'Elevation clear', 'Clear ba cao độ trên lối đi hẹp mà không đánh mất tâm ngang.', ['vertical-transfer', 'crosshair-placement', 'movement-stop'], [
            angle('lower-turn', 'Lower turn', 'low-left', 'Hạ tâm vừa đủ ở đoạn dốc.', 'Tránh kéo tâm quá thấp sau khi góc đã sạch.'),
            angle('rail-window', 'Rail window', 'high-right', 'Kiểm tra qua lan can khi bước tới cửa sổ.', 'Dừng di chuyển trước khi bắn.'),
          ], 'Khuyên dùng khi bạn thường hụt mục tiêu ở cầu thang hoặc ban công.'),
          scenario('walkback-reset', 'Walkback reset', 'Rút lui khỏi lane cao rồi quay lại xử lý góc đuổi theo.', ['retreat-aim', '180-turn', 'composure'], [
            angle('rear-gap', 'Rear gap', 'rear-left', 'Quay vừa đủ để lấy khoảng hở phía sau.', 'Không xoay quá đà; tìm đường tâm ngắn nhất.'),
            angle('canopy-door', 'Canopy door', 'front-right', 'Trở lại hướng chính với tâm đã ngang đầu.', 'Reset tâm ở cửa trước khi tiếp tục.'),
          ], 'Bài chuyển tiếp tốt trước các bài flick rộng hoặc 180 độ.'),
        ],
      },
    ],
  },
  dark: {
    id: 'dark',
    name: 'Dark Range',
    shortName: 'DARK',
    description: 'Không gian tối giản với ánh sáng định hướng, phù hợp để cô lập đường tâm và nhịp phản ứng.',
    zones: [
      {
        id: 'signal-hall',
        name: 'Signal Hall',
        description: 'Hành lang thẳng, ánh chỉ dẫn rõ và các góc peek ngắn ở hai bên.',
        scenarios: [
          scenario('hall-snap', 'Hall snap', 'Chọn đúng cạnh tường khi mục tiêu xuất hiện luân phiên trái phải.', ['reaction', 'micro-flick', 'first-shot'], [
            angle('blue-slit', 'Blue slit', 'left', 'Giữ tâm sát khe sáng, không chờ giữa hành lang.', 'Phát đầu nên xuất phát từ vị trí đặt sẵn.'),
            angle('red-slit', 'Red slit', 'right', 'Chuyển ngang sau khi khe trái đã không còn nguy hiểm.', 'Kết thúc flick rồi xác nhận tâm trước khi click.'),
          ], 'Một bài khởi động nhanh cho phát đầu và flick ngắn.'),
          scenario('hall-pressure', 'Hall pressure', 'Giữ hành lang khi mục tiêu dùng nhịp peek không đều.', ['hold-discipline', 'tracking', 'burst-control'], [
            angle('near-panel', 'Near panel', 'left', 'Khóa góc gần trước để giới hạn phần màn hình phải theo dõi.', 'Giữ chuột yên cho tới khi mục tiêu lộ.'),
            angle('end-light', 'End light', 'far-right', 'Đọc chuyển động xa qua vùng sáng cuối hall.', 'Theo mục tiêu ngắn, sau đó burst hai viên.'),
          ], 'Dùng khi bạn bắn sớm trong các pha giữ góc.'),
        ],
      },
      {
        id: 'shutter-bay',
        name: 'Shutter Bay',
        description: 'Khoang rộng với cửa cuốn và vật che thấp, tạo các chuyển góc dài.',
        scenarios: [
          scenario('shutter-swing', 'Shutter swing', 'Xử lý một mục tiêu gần rồi chuyển sang cửa cuốn ở đầu đối diện.', ['wide-flick', 'target-transfer', 'recovery'], [
            angle('crate-edge', 'Crate edge', 'near-right', 'Dọn cạnh thùng trước để tránh mục tiêu gần.', 'Giảm tốc ở cuối flick.'),
            angle('open-shutter', 'Open shutter', 'far-left', 'Đưa tâm theo đường ngang đến cửa cuốn xa.', 'Không bắn trong lúc tâm còn trượt.'),
          ], 'Nên tập ở tốc độ vừa cho đến khi hai phát đầu đều chính xác.'),
          scenario('bay-anchor', 'Bay anchor', 'Giữ vị trí giữa khoang, ưu tiên thứ tự góc theo khoảng cách.', ['angle-priority', 'crosshair-placement', 'composure'], [
            angle('low-screen', 'Low screen', 'low-left', 'Xử lý vật che thấp trước khi nhìn qua cửa cuốn.', 'Đặt tâm thấp vừa bằng chiều cao mục tiêu.'),
            angle('catwalk-cut', 'Catwalk cut', 'high-right', 'Chuyển lên góc cao ở cuối chuỗi clear.', 'Tách chuyển động dọc khỏi chuyển động ngang.'),
          ], 'Phù hợp để xây thói quen clear theo thứ tự thay vì quét ngẫu nhiên.'),
        ],
      },
      {
        id: 'core-lane',
        name: 'Core Lane',
        description: 'Lane dài có lõi phát sáng ở giữa, thuận lợi cho tracking và kiểm soát cự ly.',
        scenarios: [
          scenario('core-track', 'Core track', 'Theo mục tiêu di chuyển qua lane dài, sau đó dừng phát đầu ở điểm mở.', ['smooth-tracking', 'stop-shot', 'distance-control'], [
            angle('core-cross', 'Core cross', 'center', 'Bám mục tiêu qua lõi sáng mà không giật tâm.', 'Ưu tiên đường di chuột mượt hơn tốc độ.'),
            angle('exit-ramp', 'Exit ramp', 'far-right', 'Dừng tracking khi mục tiêu ra khỏi lane.', 'Chuyển sang phát đơn khi mục tiêu chậm lại.'),
          ], 'Khuyên dùng khi cảm giác di chuột bị rung ở cự ly trung bình.'),
          scenario('lane-reversal', 'Lane reversal', 'Đổi hướng sau tín hiệu giả, buộc reset tâm và xử lý mục tiêu sau lưng.', ['direction-change', '180-turn', 'composure'], [
            angle('front-marker', 'Front marker', 'front-left', 'Khởi đầu với marker phía trước để neo tâm.', 'Không overflick sau tín hiệu đổi hướng.'),
            angle('rear-marker', 'Rear marker', 'rear-right', 'Quay sang marker sau với góc quay ngắn nhất.', 'Dừng tâm rồi mới bắn, kể cả khi bị gấp.'),
          ], 'Dùng sau khi core-track đã ổn để luyện đổi hướng có kiểm soát.'),
        ],
      },
    ],
  },
});

export const MAP_ORDER = freeze(['lotus', 'dark']);
export const DEFAULT_SCENARIO_SELECTION = freeze({
  mapId: 'lotus', zoneId: 'sun-steps', scenarioId: 'split-entry', angleId: 'left-arch',
});

/** Recommended routes are references to entries in SCENARIO_MAPS, not copies. */
export const RECOMMENDED_SCENARIOS = freeze({
  default: { ...DEFAULT_SCENARIO_SELECTION, reason: 'Bắt đầu bằng góc gần để kiểm tra tâm ngang và phát đầu.' },
  crosshairPlacement: { mapId: 'lotus', zoneId: 'sun-steps', scenarioId: 'split-entry', angleId: 'left-arch', reason: 'Góc hẹp giúp lộ rõ tâm có chờ sẵn ở cạnh tường hay không.' },
  targetTransfer: { mapId: 'dark', zoneId: 'shutter-bay', scenarioId: 'shutter-swing', angleId: 'open-shutter', reason: 'Hai mục tiêu có khoảng cách lớn, thuận tiện luyện chuyển tâm rồi dừng.' },
  reaction: { mapId: 'dark', zoneId: 'signal-hall', scenarioId: 'hall-snap', angleId: 'red-slit', reason: 'Peek ngắn và đối xứng giúp tách phản ứng khỏi việc đọc địa hình.' },
  tracking: { mapId: 'dark', zoneId: 'core-lane', scenarioId: 'core-track', angleId: 'core-cross', reason: 'Lane sáng, ít chi tiết giúp đánh giá độ mượt của đường tâm.' },
  verticalTransfer: { mapId: 'lotus', zoneId: 'canopy-walk', scenarioId: 'elevation-clear', angleId: 'rail-window', reason: 'Độ cao thay đổi từng bước để luyện chuyển tâm dọc có kiểm soát.' },
});

export const SKILL_IDS = freeze(Object.keys(RECOMMENDED_SCENARIOS).filter((id) => id !== 'default'));

export function resolveMapId(mapId) {
  return typeof mapId === 'string' && SCENARIO_MAPS[mapId] ? mapId : DEFAULT_SCENARIO_SELECTION.mapId;
}

export function resolveMap(mapId) {
  return SCENARIO_MAPS[resolveMapId(mapId)];
}

export function resolveZoneId(mapId, zoneId) {
  const map = resolveMap(mapId);
  return map.zones.some((zone) => zone.id === zoneId) ? zoneId : map.zones[0].id;
}

export function resolveZone(mapId, zoneId) {
  const map = resolveMap(mapId);
  const id = resolveZoneId(map.id, zoneId);
  return map.zones.find((zone) => zone.id === id);
}

export function resolveScenarioId(mapId, zoneId, scenarioId) {
  const zone = resolveZone(mapId, zoneId);
  return zone.scenarios.some((item) => item.id === scenarioId) ? scenarioId : zone.scenarios[0].id;
}

export function resolveScenario(mapId, zoneId, scenarioId) {
  const zone = resolveZone(mapId, zoneId);
  const id = resolveScenarioId(mapId, zone.id, scenarioId);
  return zone.scenarios.find((item) => item.id === id);
}

export function resolveAngleId(mapId, zoneId, scenarioId, angleId) {
  const item = resolveScenario(mapId, zoneId, scenarioId);
  return item.angles.some((itemAngle) => itemAngle.id === angleId) ? angleId : item.angles[0].id;
}

export function resolveAngle(mapId, zoneId, scenarioId, angleId) {
  const item = resolveScenario(mapId, zoneId, scenarioId);
  const id = resolveAngleId(mapId, zoneId, item.id, angleId);
  return item.angles.find((itemAngle) => itemAngle.id === id);
}

/**
 * Normalizes a partial UI selection. Every returned object is a frozen catalog
 * entry, so consumers can safely keep references without mutating the data.
 */
export function resolveScenarioSelection(selection = {}) {
  const input = selection && typeof selection === 'object' ? selection : {};
  const map = resolveMap(input.mapId ?? input.map);
  const zone = resolveZone(map.id, input.zoneId ?? input.zone);
  const item = resolveScenario(map.id, zone.id, input.scenarioId ?? input.scenario);
  const selectedAngle = resolveAngle(map.id, zone.id, item.id, input.angleId ?? input.angle);
  return freeze({
    mapId: map.id,
    zoneId: zone.id,
    scenarioId: item.id,
    angleId: selectedAngle.id,
    map,
    zone,
    scenario: item,
    angle: selectedAngle,
  });
}

export const resolveSelection = resolveScenarioSelection;

/** Return an existing recommended route, with a useful default for unknown skills. */
export function recommendedScenario(skillOrOptions = 'default') {
  const skill = typeof skillOrOptions === 'string'
    ? skillOrOptions
    : skillOrOptions?.skill ?? skillOrOptions?.skillId ?? 'default';
  const recommendation = RECOMMENDED_SCENARIOS[skill] ?? RECOMMENDED_SCENARIOS.default;
  return freeze({
    ...resolveScenarioSelection(recommendation),
    skill: RECOMMENDED_SCENARIOS[skill] ? skill : 'default',
    reason: recommendation.reason,
  });
}

export const getRecommendedScenario = recommendedScenario;
