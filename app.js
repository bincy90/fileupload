const express = require('express');
const bodyParser= require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage= require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

//middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));

app.set('view engine','ejs');

//const mongoURI= 'mongodb://localhost:27017/muploads';
const mongoURI='mongodb+srv://bincy:bincy@cluster0-pxuz2.mongodb.net/test?retryWrites=true&w=majority';

const conn = mongoose.createConnection(mongoURI,{ useNewUrlParser: true }, (err)=>{
    if(!err)
    {
        console.log("sucess.");

    }
    else
    {
      console.log("eroor connecting db");
    }
});

let gfs;

conn.once('open',()=>{
  gfs= Grid(conn.db,mongoose.mongo);
  gfs.collection('uploads');
})

const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });

//route get loads form
app.get('/',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length===0){
            res.render('index',{files:false});
        }
        else{
            files.map(file=>{
                if(file.contentType === 'image/jpeg' || file.contentType ==='image/png'){
                    file.isImage= true;
                }
                else{
                    file.isImage=false;
                }
            })
            res.render('index',{files:files});

        }

       // return res.json(files);
       });
       });


// route post /upload upload file to db
app.post('/upload',upload.single('file'),(req,res)=>{
 //res.json({file:req.file});
 res.redirect('/');
})

//routes get /file display all files in json

app.get('/files',(req,res)=>{
gfs.files.find().toArray((err,files)=>{
 if(!files || files.length===0){
     return res.status(404).json({err: 'No files exist'
    });
 }
 return res.json(files);
});
});

//routes get /file/:filename single file display in json

app.get('/files/:filename',(req,res)=>{
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        if(!file || file.length===0){
            return res.status(404).json({err: 'No files exist'
           });
        }
        return res.json(file);
    });
    
    });


//routes get /image/:filename single filecontent  display rather than json file

app.get('/image/:filename',(req,res)=>{
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        if(!file || file.length===0){
            return res.status(404).json({err: 'No files exist'
           });
        }
        //check if img
        if(file.contentType === 'image/jpeg' || file.contentType ==='img/png'){
            //read output to browserv
            const readstream = gfs.createReadStream(file.filename);
           readstream.pipe(res);
        }
        else{
            res.status(404).json({err:'not an image'
        });
        }
    });
    
    });

//delete button route files/:id

app.delete('/files/:id',(req,res)=>{
 gfs.remove({_id:req.params.id,root:'uploads'},(err,gridStore)=>{
     if(err){
         return res.status(404).json({err: err});
     }

     res.redirect('/');
 })
})


const port = process.env.PORT || 3000;

app.listen(port,(err)=>{
    if(!err){
        console.log('server started on port 3000...')
    }
    else{
        console.log('server unable to start at port 3000...')
    }
})