import {
    AnimatedAxis, // any of these can be non-animated equivalents
    AnimatedGrid,
    AnimatedLineSeries,
    XYChart,
} from '@visx/xychart';
import React from "react";
import {DataContext} from "../../context";

export const Chart = () => {
    const {data} = React.useContext(DataContext);

    return (
        <XYChart
            height={700} xScale={{ type: 'band' }} yScale={{ type: 'linear', domain: [0, 30] }}>
            <AnimatedAxis orientation="bottom" />
            <AnimatedAxis orientation="left" />
            <AnimatedGrid columns={false} numTicks={4} />

            <AnimatedLineSeries
                dataKey="value"
                data={data}
                yAccessor={(d) => () => {
                    return d.value
                }}
                                xAccessor={(d) => {
                                    return d.timestamp
                                }}
            />
            {/*<Tooltip
                snapTooltipToDatumX
                snapTooltipToDatumY
                showVerticalCrosshair
                showSeriesGlyphs
                renderTooltip={({ tooltipData, colorScale }) => (
                    <div>
                        <div style={{ color: colorScale(tooltipData.nearestDatum.key) }}>
                            {tooltipData.nearestDatum.key}
                        </div>
                        {accessors.xAccessor(tooltipData.nearestDatum.datum)}
                        {', '}
                        {accessors.yAccessor(tooltipData.nearestDatum.datum)}
                    </div>
                )}
            /> */}
        </XYChart>
    )
}

