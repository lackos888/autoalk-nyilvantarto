const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const { ObjectID } = require("mongodb");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { argv } = require("process");
const app = express();
const port = 3000;

async function cryptoRandomString()
{
    return await new Promise((resolve, reject) =>
    {
        crypto.randomBytes(48, function(err, buffer) {
            return resolve(buffer.toString('hex'));
        });
    });
}

async function getMongoDBConnection()
{
    return new Promise((resolve, reject) =>
    {
        MongoClient.connect("mongodb://localhost", (err, db) =>
        {
            if(err)
            {
                return reject(err);
            }

            return resolve(db);
        });
    });
}

async function handleArgvArguments(db)
{
    const args = process.argv;

    if(args.length > 2)
    {
        if(args[2] === "adduser")
        {
            if(args.length < 5)
            {
                return console.log("Az adduser parameterhez szukseges felhasznalonev es jelszo paros!");
            }

            const user = args[3];

            if(user.length < 3)
            {
                return console.log("A felhasznalonev nem lehet kevesebb, mint 3 karakter!");
            }

            const pass = args[4];

            if(pass.length < 3)
            {
                return console.log("A jelszo nem lehet kevesebb, mint 3 karakter!");
            }

            const usersCollection = db.collection("users");

            try 
            {
                const index = await usersCollection.createIndex({username: 1}, {unique: true});
            } catch(err)
            {
                console.log("Failed to create index: " + err);
            }

            const salt = await bcrypt.genSalt(10);

            const hashedPassword = await bcrypt.hash(pass, salt);

            try 
            {
                const insertRes = await usersCollection.insertOne({
                    username: user,
                    password: hashedPassword
                });

                console.log("Felhasznalo sikeresen hozzaadva (user: " + user + " | pass: " + pass + "): " + JSON.stringify(insertRes));
            } catch(err)
            {
                console.log("Failed to insert user: " + err);
            }

            return;
        } else if(args[2] === "deleteuser")
        {
            if(args.length < 4)
            {
                return console.log("A deleteuser parameterhez szukseges egy felhasznalonev!");
            }

            const user = args[3];

            const usersCollection = db.collection("users");

            if(!usersCollection)
            {
                return console.log("Meg nincs felhasznalo hozzaadva!");
            }

            try 
            {
                const deleteRes = await usersCollection.deleteOne({username: user});

                if(!deleteRes || !deleteRes.deletedCount)
                {
                    return console.log("A(z) " + user + " nevu felhasznalo mar nem letezik!");
                }

                return console.log("A(z) " + user + " nevu felhasznalo sikeresen torolve lett: " + JSON.stringify(deleteRes));
            } catch(err)
            {
                console.log("Failed to delete user: " + err);
            }

            return;
        } 
        else
        {
            return console.log("Hasznalhato parancsok: adduser (felhasznalonev jelszo), deleteuser (felhasznalonev)");
        }
    }
}

async function initApp()
{
    let mongoDBConnection = null;

    try 
    {
        mongoDBConnection = await getMongoDBConnection();
    } catch(err)
    {
        console.log("Failed to get mongodb connection: " + err + "|stack: " + err.stack);

        return;
    }

    const db = mongoDBConnection.db("autoalk");

    if(argv.length > 2)
    {
        handleArgvArguments(db);

        return process.exit(0);
    }

    const authCurrentUser = async (sessionId) =>
    {
        const usersCollection = db.collection("users");

        if(!usersCollection)
        {
            return false;
        }

        let dbFindRes = null;

        try 
        {
            dbFindRes = await usersCollection.findOne({
                sessionId: sessionId,
            });

            if(!dbFindRes)
            {
                return false;
            } else 
            {
                return true;
            }
        } catch(err)
        {
            console.log("HTTP authCurrentUser err: " + err);

            return false;
        }

        return false;
    };

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json({limit: '50kb'}));
    app.disable('x-powered-by');

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    /* START OF API ENDPOINTS */

    app.options("/login", (req, res) =>
    {
        return res.json({});
    }); //blank for Angular

    app.post('/login', async (req, res) => 
    {
        if(!req || !req.body)
        {
            return res.json({});
        }

        if(!req.body.username || !req.body.password || typeof(req.body.username) !== "string" || typeof(req.body.password) !== "string")
        {
            return res.json({});
        }

        const handleError = (errorString) =>
        {
            return res.json({
                successful: false,
                possibleErrorString: errorString
            });
        };

        const usersCollection = db.collection("users");

        const wrongUserOrPassStr = "Hibás felhasználónév vagy jelszó!";

        if(!usersCollection)
        {
            return handleError(wrongUserOrPassStr);
        }

        let dbFindRes = null;

        try 
        {
            dbFindRes = await usersCollection.findOne({
                username: req.body.username,
            });

            if(!dbFindRes)
            {
                return handleError(wrongUserOrPassStr);
            }
        } catch(err)
        {
            console.log("HTTP /login err: " + err);

            return res.json({});
        }

        if(await bcrypt.compare(req.body.password, dbFindRes.password))
        {
            const randomlyGeneratedSessionId = req.body.username + await cryptoRandomString();

            try 
            {
                const updateRet = await usersCollection.updateOne({
                    _id: ObjectID(dbFindRes["_id"])
                }, {
                    $set: {
                        sessionId: randomlyGeneratedSessionId
                    }
                });

                if(!updateRet)
                {
                    return handleError(wrongUserOrPassStr);
                }
            } catch(err)
            {
                console.log("HTTP /login err #2: " + err);

                return res.json({});
            }

            return res.json({
                successful: true,
                possibleErrorString: "",
                realUsername: dbFindRes.username,
                ourSessionId: randomlyGeneratedSessionId
            });
        }

        return handleError(wrongUserOrPassStr);
    });

    //

    app.options("/carlist", (req, res) =>
    {
        return res.json({});
    }); //blank for Angular

    app.post("/carlist", async (req, res) =>
    {   
        if(!req || !req.body)
        {
            return res.json({successful: false});
        }

        if(!req.body.sessionId || typeof(req.body.sessionId) !== "string")
        {
            return res.json({successful: false});
        }

        if(!await authCurrentUser(req.body.sessionId))
        {
            return res.json({successful: false});
        }

        const handleError = (errorString) =>
        {
            return res.json({
                successful: false,
                errorString: errorString
            });
        };

        const carsCollection = db.collection("cars");

        if(!carsCollection)
        {
            return handleError("adatbázishiba");
        }

        try 
        {
            const dbRet = await carsCollection.find({}).toArray();

            return res.json(dbRet);
        } catch(err)
        {
            console.log("HTTP /carlist err: " + err);
        }

        return res.json({successful: false});
    });

    //

    app.options("/addcar", (req, res) =>
    {
        return res.json({});
    }); //blank for Angular

    app.post("/addcar", async (req, res) =>
    {   
        if(!req || !req.body)
        {
            return res.json({successful: false});
        }

        if(!req.body.sessionId || typeof(req.body.sessionId) !== "string")
        {
            return res.json({successful: false});
        }

        if(!await authCurrentUser(req.body.sessionId))
        {
            return res.json({successful: false});
        }

        if(!req.body.editData || typeof(req.body.editData) !== "object")
        {
            return res.json({successful: false});
        }

        const editData = req.body.editData;

        if(typeof(editData.brand) !== "string" || !editData.brand)
        {
            return res.json({successful: false});
        }

        if(!editData.modelData || !editData.modelData.modelData || typeof(editData.modelData.modelName) !== "string" || !editData.modelData.modelName)
        {
            return res.json({successful: false});
        }

        if(typeof(editData.modelData.modelData.type) !== "string" || !editData.modelData.modelData.type)
        {
            return res.json({successful: false});
        }

        const shouldBeNumbers = ['modelYear', 'hp', 'nm'];

        for(let it = 0; it < shouldBeNumbers.length; it++)
        {
            const field = shouldBeNumbers[it];

            const val = parseInt(editData.modelData.modelData[field]);

            if(isNaN(val))
            {
                return res.json({successful: false});
            }
        }
        
        const handleError = (errorString) =>
        {
            return res.json({
                successful: false,
                errorString: errorString
            });
        };

        const carsCollection = db.collection("cars");

        if(!carsCollection)
        {
            return handleError("adatbázishiba");
        }

        if(editData.dbID == -1)
        {
            let insertRet = null;
            
            try 
            {
                insertRet = await carsCollection.insertOne({
                    brand: editData.brand,
                    modelName: editData.modelData.modelName,
                    modelYear: editData.modelData.modelData.modelYear,
                    engineCode: editData.modelData.modelData.engineCode,
                    hp: editData.modelData.modelData.hp,
                    nm: editData.modelData.modelData.nm,
                    type: editData.modelData.modelData.type
                });
            } catch(err)
            {
                console.log("HTTP /addcar err: " + err);
            }

            if(!insertRet)
            {
                return handleError("Adatbázishiba történt a beszúrás közben!");
            }

            return res.json({
                successful: true,
                dbid: insertRet["insertedId"]
            });
        } else 
        {
            let modifyRet = null;

            try 
            {
                modifyRet = await carsCollection.updateOne({
                    _id: ObjectID(editData.dbID)
                }, {
                    $set: {
                        modelName: editData.modelData.modelName,
                        modelYear: editData.modelData.modelData.modelYear,
                        engineCode: editData.modelData.modelData.engineCode,
                        hp: editData.modelData.modelData.hp,
                        nm: editData.modelData.modelData.nm,
                        type: editData.modelData.modelData.type
                    }
                });
            } catch(err)
            {
                console.log("HTTP /addcar err #2: " + err);
            }

            if(!modifyRet)
            {
                return handleError("Adatbázishiba történt a módosítás közben!");
            }

            return res.json({
                successful: true,
                dbid: editData.dbID
            });
        }

        return res.json({});
    });

    //

    //

    app.options("/delcar", (req, res) =>
    {
        return res.json({});
    }); //blank for Angular

    app.post("/delcar", async (req, res) =>
    {   
        if(!req || !req.body)
        {
            return res.json({successful: false});
        }

        if(!req.body.sessionId || typeof(req.body.sessionId) !== "string")
        {
            return res.json({successful: false});
        }

        if(!await authCurrentUser(req.body.sessionId))
        {
            return res.json({successful: false});
        }

        const vehicleDBID = req.body.vehicleDBID;

        if(!vehicleDBID || typeof(vehicleDBID) !== "string")
        {
            return res.json({successful: false});
        }

        const handleError = (errorString) =>
        {
            return res.json({
                successful: false,
                errorString: errorString
            });
        };

        const carsCollection = db.collection("cars");

        if(!carsCollection)
        {
            return handleError("adatbázishiba");
        }

        let deletionRet = null;
        
        try 
        {
            deletionRet = await carsCollection.deleteOne({
                "_id": ObjectID(vehicleDBID)
            });
        } catch(err)
        {
            console.log("HTTP /delcar err: " + err);
        }

        if(!deletionRet)
        {
            return handleError("Adatbázishiba történt a törlés közben!");
        }

        return res.json({
            successful: true
        });
    });

    //

    app.options("/logout", (req, res) =>
    {
        return res.json({});
    }); //blank for Angular

    app.post('/logout', async (req, res) => 
    {
        if(!req || !req.body)
        {
            return res.json({});
        }

        if(!req.body.sessionId || typeof(req.body.sessionId) !== "string")
        {
            return res.json({});
        }

        const handleError = () =>
        {
            return res.json({
                successful: false
            });
        };

        const usersCollection = db.collection("users");

        if(!usersCollection)
        {
            return handleError();
        }

        let dbFindRes = null;

        try 
        {
            dbFindRes = await usersCollection.findOne({
                sessionId: req.body.sessionId,
            });

            if(!dbFindRes)
            {
                return res.json({successful: true});
            }
        } catch(err)
        {
            console.log("HTTP /logout err: " + err);

            return res.json({});
        }

        try 
        {
            const updateRet = await usersCollection.updateOne({
                _id: ObjectID(dbFindRes["_id"])
            }, {
                $set: {
                    sessionId: req.body.sessionId
                }
            });

            if(!updateRet)
            {
                return handleError();
            }
        } catch(err)
        {
            console.log("HTTP /logout err #2: " + err);

            return res.json({});
        }

        return res.json({
            successful: true
        });
    });

    /* BLANK 404 PAGE */

    app.use((req, res) =>
    {
        res.set('Server', 'nginx');
        res.status(404).send(`<html>
    <head><title>404 Not Found</title></head>
    <body>
    <center><h1>404 Not Found</h1></center>
    <hr><center>nginx</center>
    </body>
    </html>
    <!-- a padding to disable MSIE and Chrome friendly error page -->
    <!-- a padding to disable MSIE and Chrome friendly error page -->
    <!-- a padding to disable MSIE and Chrome friendly error page -->
    <!-- a padding to disable MSIE and Chrome friendly error page -->
    <!-- a padding to disable MSIE and Chrome friendly error page -->
    <!-- a padding to disable MSIE and Chrome friendly error page -->
    `);
    });

    app.listen(port, () => {
        console.log(`App has been started on port ${port}`)
    });
}

initApp();