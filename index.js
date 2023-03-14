const express = require('express');
const app = express();
const bodyparser = require('body-parser')
const port = process.env.PORT || 5000;


// Parse JSON bodies (as sent by API clients)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const { connection } = require('./connector');

app.get('/totalRecovered', async (req, res) => {
    try{
        const recoveredSum = await connection.aggregate([{$group : {_id : "total", recovered : {$sum : "$recovered"}}}])
        res.json({data : recoveredSum[0]})
    }
    catch(err){
        res.status(400).send(err)
    }

})

app.get('/totalActive', async (req, res) => {
    try{
        let totalActive = await connection.aggregate([
            {$group : 
                {_id : 'total', infected:{$sum : "$infected"}, recovered : {$sum: "$recovered"}}
            }
        ])
        res.json({data : {_id : totalActive[0]._id, active : totalActive[0].infected - totalActive[0].recovered}})
    }
    catch(errr){
        res.status(400).send(errr)
    }
})

app.get('/totalDeath', async (req, res) => {
    try{
        const recoveredSum = await connection.aggregate([{$group : {_id : "total", death : {$sum : "$death"}}}])
        res.json({data : recoveredSum[0]})
    }
    catch(err){
        res.status(400).send(err)
    }

})


app.get('/hotspotStates', async (req, res) => {
    try {
        const hotspot = await connection.aggregate([
            {
                $group: {
                    _id: "$state",
                    infected: { $sum: "$infected" },
                    recovered: { $sum: "$recovered" }
                }
            },
            {
                $project: {
                    state: "$_id",
                    rate: {
                        $round: [
                            {
                                $divide: [
                                    { $subtract: ["$infected", "$recovered"] },
                                    "$infected"
                                ]
                            },
                            5
                        ]
                    }
                }
            },
            {
                $match: {
                    rate: { $gt: 0.1 }
                }
            }
        ]);

        res.json({ data: hotspot });

    } catch (err) {
        res.status(500).send(err);
    }
})

app.get('/healthyStates', async (req, res) => {
    try {
        const states = await connection.aggregate([
            {
                $project: {
                    _id: "$state",
                    state : '$state',
                    mortality: {
                        $round: [{ $divide: ['$death', '$infected'] }, 5]
                    }
                }
            },
            {
                $match: {
                    mortality: { $lt: 0.005 }
                }
            }
            // {
            //     $project: {
            //         _id: "$_id",
            //         state: "$_id",
            //         mortality: 1
            //     }
            // }
        ])

        res.json({ data: states });
    } catch (err) {
        res.status(500).send(err);
    }
});


app.listen(port, () => console.log(`App listening on port ${port}!`))

module.exports = app;